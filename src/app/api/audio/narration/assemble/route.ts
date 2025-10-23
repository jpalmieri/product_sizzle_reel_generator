/**
 * Narration Audio Track Assembly API Route
 *
 * Generates a full-length audio file with narration clips positioned at their
 * timeline times, with silence filling the gaps.
 *
 * POST /api/audio/narration/assemble
 *
 * Request body:
 * - timeline: Timeline with narration clips
 * - generatedNarration: Record of generated narration audio URLs by ID
 * - totalDuration: Total duration of the video in seconds
 *
 * Response:
 * - audioUrl: base64 data URL of assembled narration track
 * - duration: Total duration in seconds
 * - processingTimeMs: Time taken to assemble
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
import { isNarrationClip } from "@/types/timeline";

const execAsync = promisify(exec);

interface NarrationAssembleRequest {
  timeline: Timeline;
  generatedNarration: Record<string, { audioUrl: string }>;
  totalDuration: number;
}

interface NarrationAssembleResponse {
  audioUrl: string; // base64 data URL
  duration: number;
  processingTimeMs: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(tmpdir(), 'sizzle-reel-narration');
  const tempFiles: string[] = [];

  try {
    const body: NarrationAssembleRequest = await request.json();

    if (!body.timeline || !body.generatedNarration || !body.totalDuration) {
      return NextResponse.json(
        { error: "timeline, generatedNarration, and totalDuration are required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Create temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Get narration clips from timeline
    const audioTrack = body.timeline.tracks.find(track => track.type === 'audio');
    if (!audioTrack) {
      // No narration - return silent audio track
      const silentAudioPath = path.join(tempDir, `silent-${Date.now()}.mp3`);
      tempFiles.push(silentAudioPath);

      const silentCommand = `ffmpeg -t ${body.totalDuration} -f lavfi -i anullsrc=r=44100:cl=stereo -c:a libmp3lame -q:a 2 -y "${silentAudioPath}"`;
      await execAsync(silentCommand);

      const { readFile } = await import('fs/promises');
      const audioBuffer = await readFile(silentAudioPath);
      const audioBase64 = audioBuffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

      return NextResponse.json({
        audioUrl,
        duration: body.totalDuration,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Filter and sort narration clips
    const narrationClips = audioTrack.clips
      .filter(isNarrationClip)
      .sort((a, b) => a.startTime - b.startTime);

    if (narrationClips.length === 0) {
      // No narration clips - return silent audio track
      const silentAudioPath = path.join(tempDir, `silent-${Date.now()}.mp3`);
      tempFiles.push(silentAudioPath);

      const silentCommand = `ffmpeg -t ${body.totalDuration} -f lavfi -i anullsrc=r=44100:cl=stereo -c:a libmp3lame -q:a 2 -y "${silentAudioPath}"`;
      await execAsync(silentCommand);

      const { readFile } = await import('fs/promises');
      const audioBuffer = await readFile(silentAudioPath);
      const audioBase64 = audioBuffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

      return NextResponse.json({
        audioUrl,
        duration: body.totalDuration,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Write each narration clip to temp file
    const clipInputs: string[] = [];
    const filterParts: string[] = [];

    for (let i = 0; i < narrationClips.length; i++) {
      const clip = narrationClips[i];
      const narrationData = body.generatedNarration[clip.sourceId];

      if (!narrationData?.audioUrl) {
        throw new Error(`Narration audio not found for ${clip.sourceId}`);
      }

      // Extract base64 data
      const base64Data = narrationData.audioUrl.split(',')[1] || narrationData.audioUrl;
      const audioBuffer = Buffer.from(base64Data, 'base64');

      // Write to temp file
      const clipPath = path.join(tempDir, `narration-${i}-${clip.sourceId}.mp3`);
      await writeFile(clipPath, audioBuffer);
      tempFiles.push(clipPath);
      clipInputs.push(clipPath);

      // Create filter for this clip with delay
      // adelay expects milliseconds
      const delayMs = Math.round(clip.startTime * 1000);
      filterParts.push(`[${i + 1}:a]adelay=${delayMs}|${delayMs}[a${i}]`);
    }

    // Build FFmpeg command
    // Start with silent base track (IMPORTANT: -t must come BEFORE -i to limit input duration)
    let ffmpegCommand = `ffmpeg -t ${body.totalDuration} -f lavfi -i anullsrc=r=44100:cl=stereo`;

    // Add all narration clip inputs
    for (const clipPath of clipInputs) {
      ffmpegCommand += ` -i "${clipPath}"`;
    }

    // Build filter_complex with loudness normalization for speech/narration
    // Using -23 LUFS (broadcast standard) for conservative, comfortable listening level
    const filterComplex = filterParts.join('; ');
    const mixInputs = ['[0:a]', ...Array.from({ length: narrationClips.length }, (_, i) => `[a${i}]`)].join('');
    const fullFilter = `${filterComplex}; ${mixInputs}amix=inputs=${narrationClips.length + 1}:dropout_transition=0[mixed]; [mixed]loudnorm=I=-23:LRA=7:TP=-2[out]`;

    ffmpegCommand += ` -filter_complex "${fullFilter}" -map "[out]"`;

    // Output path
    const outputPath = path.join(tempDir, `narration-track-${Date.now()}.mp3`);
    tempFiles.push(outputPath);

    // Trim to exact storyboard duration to prevent overrun from last narration clip
    ffmpegCommand += ` -t ${body.totalDuration} -c:a libmp3lame -q:a 2 -y "${outputPath}"`;

    await execAsync(ffmpegCommand, { timeout: 30000 }); // 30 second timeout

    // Read assembled audio
    const { readFile } = await import('fs/promises');
    const audioBuffer = await readFile(outputPath);
    const audioBase64 = audioBuffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    const processingTimeMs = Date.now() - startTime;

    const result: NarrationAssembleResponse = {
      audioUrl,
      duration: body.totalDuration,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Narration assembly error:", error);
    return NextResponse.json(
      {
        error: "Failed to assemble narration track",
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
