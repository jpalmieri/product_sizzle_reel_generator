/**
 * Final Video Assembly API Route
 *
 * Combines silent video with narration and ducked music audio tracks into final sizzle reel.
 *
 * POST /api/video/assemble
 *
 * Request body:
 * - videoUrl: base64 data URL of silent stitched video
 * - narrationAudioUrl: base64 data URL of positioned narration track
 * - musicAudioUrl: base64 data URL of ducked music track
 *
 * Response:
 * - videoUrl: base64 data URL of final sizzle reel
 * - duration: Total duration in seconds
 * - processingTimeMs: Time taken to assemble
 *
 * Note: Uses /tmp directory which has 512MB limit on Vercel (see issue #102)
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

interface VideoAssembleRequest {
  videoUrl: string; // base64 data URL
  narrationAudioUrl: string; // base64 data URL
  musicAudioUrl: string; // base64 data URL
}

interface VideoAssembleResponse {
  videoUrl: string; // base64 data URL
  duration: number;
  fileSize: number; // bytes
  processingTimeMs: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(tmpdir(), 'sizzle-reel-assemble');
  const tempFiles: string[] = [];

  try {
    const body: VideoAssembleRequest = await request.json();

    if (!body.videoUrl || !body.narrationAudioUrl || !body.musicAudioUrl) {
      return NextResponse.json(
        { error: "videoUrl, narrationAudioUrl, and musicAudioUrl are required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Create temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Write video file to temp
    const videoBase64 = body.videoUrl.split(',')[1] || body.videoUrl;
    const videoBuffer = Buffer.from(videoBase64, 'base64');
    const videoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
    await writeFile(videoPath, videoBuffer);
    tempFiles.push(videoPath);

    // Write narration audio to temp
    const narrationBase64 = body.narrationAudioUrl.split(',')[1] || body.narrationAudioUrl;
    const narrationBuffer = Buffer.from(narrationBase64, 'base64');
    const narrationPath = path.join(tempDir, `narration-${Date.now()}.mp3`);
    await writeFile(narrationPath, narrationBuffer);
    tempFiles.push(narrationPath);

    // Write music audio to temp
    const musicBase64 = body.musicAudioUrl.split(',')[1] || body.musicAudioUrl;
    const musicBuffer = Buffer.from(musicBase64, 'base64');
    const musicPath = path.join(tempDir, `music-${Date.now()}.mp3`);
    await writeFile(musicPath, musicBuffer);
    tempFiles.push(musicPath);

    // Output path
    const outputPath = path.join(tempDir, `final-sizzle-reel-${Date.now()}.mp4`);
    tempFiles.push(outputPath);

    // Mix audio tracks and combine with video
    // Use amix to combine narration + music, then map to video
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -i "${narrationPath}" -i "${musicPath}" -filter_complex "[1:a][2:a]amix=inputs=2:dropout_transition=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;

    await execAsync(ffmpegCommand, { timeout: 60000 }); // 60 second timeout

    // Read final video
    const { readFile } = await import('fs/promises');
    const finalBuffer = await readFile(outputPath);
    const finalBase64 = finalBuffer.toString('base64');
    const videoUrl = `data:video/mp4;base64,${finalBase64}`;

    // Get file stats
    const stats = await stat(outputPath);
    const fileSize = stats.size;

    // Get video duration using ffprobe
    const { stdout: probeOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
    );
    const duration = parseFloat(probeOutput.trim());

    const processingTimeMs = Date.now() - startTime;

    const result: VideoAssembleResponse = {
      videoUrl,
      duration,
      fileSize,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Video assembly error:", error);
    return NextResponse.json(
      {
        error: "Failed to assemble final video",
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
