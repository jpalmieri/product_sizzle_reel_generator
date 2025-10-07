/**
 * Video Clip Extraction API Route
 *
 * Extracts a clip from a source video using FFmpeg based on start and end times.
 * Used to extract UI shot clips from uploaded screen recordings.
 *
 * POST /api/video/extract
 *
 * Request body:
 * - shotId: Unique identifier for the shot
 * - videoData: base64 encoded video data
 * - startTime: Start time in seconds
 * - endTime: End time in seconds
 *
 * Response:
 * - shotId: Shot identifier
 * - videoUrl: base64 data URL of extracted clip
 * - duration: Actual duration of extracted clip
 * - processingTimeMs: Time taken to extract
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

interface VideoExtractRequest {
  shotId: string;
  videoData: string; // base64 data URL
  startTime: number;
  endTime: number;
}

interface VideoExtractResponse {
  shotId: string;
  videoUrl: string; // base64 data URL of extracted clip
  duration: number;
  processingTimeMs: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(tmpdir(), 'sizzle-reel-extract');
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    const body: VideoExtractRequest = await request.json();

    if (!body.shotId || !body.videoData || body.startTime === undefined || body.endTime === undefined) {
      return NextResponse.json(
        { error: "shotId, videoData, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    // Validate time range
    if (body.startTime < 0 || body.endTime <= body.startTime) {
      return NextResponse.json(
        { error: "Invalid time range" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Create temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Extract base64 data from data URL
    const base64Data = body.videoData.split(',')[1] || body.videoData;
    const videoBuffer = Buffer.from(base64Data, 'base64');

    // Write input video to temp file
    inputPath = path.join(tempDir, `input-${body.shotId}.mp4`);
    outputPath = path.join(tempDir, `output-${body.shotId}.mp4`);

    await writeFile(inputPath, videoBuffer);

    // Extract clip using FFmpeg
    // -ss: start time (before input for faster seeking)
    // -t: duration to extract
    // Re-encode to ensure proper video file (instead of -c copy which can cause keyframe issues)
    const duration = body.endTime - body.startTime;
    const ffmpegCommand = `ffmpeg -ss ${body.startTime} -i "${inputPath}" -t ${duration} -c:v libx264 -c:a aac -y "${outputPath}"`;

    await execAsync(ffmpegCommand);

    // Read extracted clip
    const { readFile } = await import('fs/promises');
    const clipBuffer = await readFile(outputPath);
    const clipBase64 = clipBuffer.toString('base64');
    const videoUrl = `data:video/mp4;base64,${clipBase64}`;

    const processingTimeMs = Date.now() - startTime;

    const result: VideoExtractResponse = {
      shotId: body.shotId,
      videoUrl,
      duration,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Video extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract video clip", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    // Cleanup temp files
    try {
      if (inputPath && existsSync(inputPath)) {
        await unlink(inputPath);
      }
      if (outputPath && existsSync(outputPath)) {
        await unlink(outputPath);
      }
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }
  }
}
