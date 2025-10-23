/**
 * Ducked Music Track API Route
 *
 * Generates a full-length music audio file with pre-baked volume automation (ducking)
 * that lowers volume during narration segments with smooth fades.
 *
 * POST /api/audio/music/duck
 *
 * Request body:
 * - musicUrl: base64 data URL of background music
 * - timeline: Timeline with narration clips
 * - duckingSettings: Volume levels and fade duration
 * - totalDuration: Total duration of the video in seconds
 *
 * Response:
 * - audioUrl: base64 data URL of ducked music track
 * - duration: Total duration in seconds
 * - processingTimeMs: Time taken to process
 *
 * Note: Uses /tmp directory which has 512MB limit on Vercel (see issue #102)
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import type { Timeline } from "@/types/timeline";
import type { MusicDuckingSettings } from "@/types/music";
import { isNarrationClip } from "@/types/timeline";

const execAsync = promisify(exec);

interface MusicDuckRequest {
  musicUrl: string; // base64 data URL
  timeline: Timeline;
  duckingSettings: MusicDuckingSettings;
  totalDuration: number;
}

interface MusicDuckResponse {
  audioUrl: string; // base64 data URL
  duration: number;
  processingTimeMs: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(tmpdir(), 'sizzle-reel-music-duck');
  const tempFiles: string[] = [];

  try {
    const body: MusicDuckRequest = await request.json();

    if (!body.musicUrl || !body.timeline || !body.duckingSettings || !body.totalDuration) {
      return NextResponse.json(
        { error: "musicUrl, timeline, duckingSettings, and totalDuration are required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Create temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Write music file to temp
    const base64Data = body.musicUrl.split(',')[1] || body.musicUrl;
    const musicBuffer = Buffer.from(base64Data, 'base64');
    const musicPath = path.join(tempDir, `music-${Date.now()}.mp3`);
    await writeFile(musicPath, musicBuffer);
    tempFiles.push(musicPath);

    // If ducking is disabled, just trim music to duration and return
    if (!body.duckingSettings.enabled) {
      const outputPath = path.join(tempDir, `music-output-${Date.now()}.mp3`);
      tempFiles.push(outputPath);

      const trimCommand = `ffmpeg -i "${musicPath}" -t ${body.totalDuration} -c:a libmp3lame -q:a 2 -y "${outputPath}"`;
      await execAsync(trimCommand, { timeout: 30000 });

      const { readFile } = await import('fs/promises');
      const audioBuffer = await readFile(outputPath);
      const audioBase64 = audioBuffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

      return NextResponse.json({
        audioUrl,
        duration: body.totalDuration,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Get narration clips from timeline
    const audioTrack = body.timeline.tracks.find(track => track.type === 'audio');
    const narrationClips = audioTrack
      ? audioTrack.clips.filter(isNarrationClip).sort((a, b) => a.startTime - b.startTime)
      : [];

    // If no narration clips, just trim music and return
    if (narrationClips.length === 0) {
      const outputPath = path.join(tempDir, `music-output-${Date.now()}.mp3`);
      tempFiles.push(outputPath);

      const trimCommand = `ffmpeg -i "${musicPath}" -t ${body.totalDuration} -c:a libmp3lame -q:a 2 -y "${outputPath}"`;
      await execAsync(trimCommand, { timeout: 30000 });

      const { readFile } = await import('fs/promises');
      const audioBuffer = await readFile(outputPath);
      const audioBase64 = audioBuffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

      return NextResponse.json({
        audioUrl,
        duration: body.totalDuration,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Build volume automation expression
    // FFmpeg volume filter supports if/between expressions evaluated per frame
    const LOOKAHEAD = 0.2; // seconds
    const { normalVolume, duckedVolume, fadeDuration } = body.duckingSettings;

    // Build volume expression that smoothly fades between normal and ducked volume
    // For each narration clip, we create a fade-down and fade-up region
    let volumeExpr = `${normalVolume}`; // default volume

    for (const clip of narrationClips) {
      const fadeStart = Math.max(0, clip.startTime - LOOKAHEAD);
      const fadeEnd = fadeStart + fadeDuration;
      const unfadeStart = clip.startTime + clip.duration;
      const unfadeEnd = unfadeStart + fadeDuration;

      // During fade down: linear interpolation from normalVolume to duckedVolume
      volumeExpr = `if(between(t,${fadeStart},${fadeEnd}),${normalVolume}-(${normalVolume}-${duckedVolume})*(t-${fadeStart})/${fadeDuration},${volumeExpr})`;

      // During narration: hold at duckedVolume
      volumeExpr = `if(between(t,${fadeEnd},${unfadeStart}),${duckedVolume},${volumeExpr})`;

      // During fade up: linear interpolation from duckedVolume to normalVolume
      volumeExpr = `if(between(t,${unfadeStart},${unfadeEnd}),${duckedVolume}+(${normalVolume}-${duckedVolume})*(t-${unfadeStart})/${fadeDuration},${volumeExpr})`;
    }

    // Output path
    const outputPath = path.join(tempDir, `music-ducked-${Date.now()}.mp3`);
    tempFiles.push(outputPath);

    // Apply volume automation and trim to duration
    const ffmpegCommand = `ffmpeg -i "${musicPath}" -filter_complex "[0:a]volume='${volumeExpr}':eval=frame[out]" -map "[out]" -t ${body.totalDuration} -c:a libmp3lame -q:a 2 -y "${outputPath}"`;

    await execAsync(ffmpegCommand, { timeout: 30000 });

    // Read ducked music
    const { readFile } = await import('fs/promises');
    const audioBuffer = await readFile(outputPath);
    const audioBase64 = audioBuffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    const processingTimeMs = Date.now() - startTime;

    const result: MusicDuckResponse = {
      audioUrl,
      duration: body.totalDuration,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Music ducking error:", error);
    return NextResponse.json(
      {
        error: "Failed to duck music track",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    // Cleanup temp files
    for (const filePath of tempFiles) {
      try {
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }
  }
}
