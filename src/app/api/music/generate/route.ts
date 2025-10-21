/**
 * Background Music Generation API Route
 *
 * Generates instrumental background music using ElevenLabs Music API.
 * Takes a music prompt and duration to generate music that matches the sizzle reel.
 *
 * POST /api/music/generate
 *
 * Request body:
 * - prompt: Detailed music generation prompt
 * - durationMs: Requested music length in milliseconds
 * - modelId: (optional) ElevenLabs music model ID
 *
 * Response:
 * - audioUrl: base64 data URL of generated music
 * - prompt: The prompt used
 * - requestedDurationMs: What we asked for
 * - actualDurationSeconds: Actual duration from audio metadata
 * - processingTimeMs: Time taken to generate
 */

import { NextRequest, NextResponse } from "next/server";
import type { MusicGenerationRequest, MusicGenerationResponse } from "@/types/music";

const ELEVENLABS_MUSIC_API_URL = "https://api.elevenlabs.io/v1/music";
const DEFAULT_MODEL_ID = "music_v1";

export async function POST(request: NextRequest) {
  try {
    const body: MusicGenerationRequest = await request.json();

    if (!body.prompt || !body.durationMs) {
      return NextResponse.json(
        { error: "prompt and durationMs are required" },
        { status: 400 }
      );
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const modelId = body.modelId || DEFAULT_MODEL_ID;

    const startTime = Date.now();

    // Call ElevenLabs Music API
    const response = await fetch(ELEVENLABS_MUSIC_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/octet-stream",
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        prompt: body.prompt,
        music_length_ms: body.durationMs,
        model_id: modelId,
        force_instrumental: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs Music API error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate music", details: errorText },
        { status: response.status }
      );
    }

    const processingTimeMs = Date.now() - startTime;

    // Convert audio to base64 data URL
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Calculate audio duration from MP3 data
    // We'll estimate based on bitrate and file size as a fallback
    // Client will load the actual audio to get precise duration
    const fileSizeBytes = audioBuffer.byteLength;
    const estimatedBitrateKbps = 128; // Standard MP3 bitrate
    const estimatedDurationSeconds = (fileSizeBytes * 8) / (estimatedBitrateKbps * 1000);

    const result: MusicGenerationResponse = {
      audioUrl,
      prompt: body.prompt,
      requestedDurationMs: body.durationMs,
      actualDurationSeconds: estimatedDurationSeconds,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Music generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate music", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
