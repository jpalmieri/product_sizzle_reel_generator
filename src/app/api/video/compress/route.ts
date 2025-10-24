/**
 * Video Compression API Route
 *
 * Compresses videos that exceed size limits for Gemini video analysis.
 * Maintains aspect ratio and frame rate while reducing file size.
 *
 * POST /api/video/compress
 *
 * Request body:
 * - videoData: base64 data URL of video
 * - targetSizeMB: target file size in MB (default: 9)
 *
 * Response:
 * - compressedVideo: base64 data URL of compressed video
 * - originalSize: original file size in bytes
 * - compressedSize: compressed file size in bytes
 * - compressionRatio: ratio of compression
 * - processingTimeMs: time taken to compress
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

const execAsync = promisify(exec);

interface VideoCompressRequest {
  videoData: string; // base64 data URL
  targetSizeMB?: number; // target size in MB (default: 9)
}

interface VideoCompressResponse {
  compressedVideo: string; // base64 data URL
  originalSize: number; // bytes
  compressedSize: number; // bytes
  compressionRatio: number; // e.g., 0.5 means 50% of original
  processingTimeMs: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(tmpdir(), 'sizzle-reel-compress');
  const tempFiles: string[] = [];

  try {
    const body: VideoCompressRequest = await request.json();

    if (!body.videoData) {
      return NextResponse.json(
        { error: "videoData is required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const targetSizeMB = body.targetSizeMB || 9; // Default to 9MB to stay under 10MB limit

    // Create temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Extract base64 data and write to temp file
    const base64Data = body.videoData.split(',')[1] || body.videoData;
    const videoBuffer = Buffer.from(base64Data, 'base64');
    const originalSize = videoBuffer.length;

    const inputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
    await writeFile(inputPath, videoBuffer);
    tempFiles.push(inputPath);

    // Output path
    const outputPath = path.join(tempDir, `compressed-${Date.now()}.mp4`);
    tempFiles.push(outputPath);

    // Compress video with FFmpeg
    // Strategy: reduce resolution and increase CRF for smaller file size
    // - Scale down to max 1280px width (maintains aspect ratio)
    // - CRF 28 (higher = more compression, lower quality)
    // - Fast preset for faster encoding
    // - faststart for web streaming
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -vf "scale='min(1280,iw)':-2" -c:v libx264 -crf 28 -preset fast -movflags +faststart -an -y "${outputPath}"`;

    await execAsync(ffmpegCommand, { timeout: 120000 }); // 2 minute timeout

    // Read compressed video
    const { readFile } = await import('fs/promises');
    const compressedBuffer = await readFile(outputPath);
    const compressedSize = compressedBuffer.length;

    // Check if compression achieved target
    const compressedSizeMB = compressedSize / (1024 * 1024);
    if (compressedSizeMB > targetSizeMB) {
      console.warn(`Compressed video (${compressedSizeMB.toFixed(2)}MB) exceeds target (${targetSizeMB}MB)`);
    }

    const compressedBase64 = compressedBuffer.toString('base64');
    const compressedVideo = `data:video/mp4;base64,${compressedBase64}`;

    const compressionRatio = compressedSize / originalSize;
    const processingTimeMs = Date.now() - startTime;

    const result: VideoCompressResponse = {
      compressedVideo,
      originalSize,
      compressedSize,
      compressionRatio,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Video compression error:", error);
    return NextResponse.json(
      {
        error: "Failed to compress video",
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
