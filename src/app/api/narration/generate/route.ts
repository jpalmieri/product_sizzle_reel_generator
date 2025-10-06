/**
 * Narration Audio Generation API Route
 *
 * Generates voiceover audio from text using ElevenLabs text-to-speech.
 * Takes narration text and generates professional voiceover audio.
 *
 * POST /api/narration/generate
 *
 * Request body:
 * - narrationId: Unique identifier for the narration segment
 * - text: Narration script text
 * - voiceId: (optional) ElevenLabs voice ID
 * - model: (optional) ElevenLabs model ID
 *
 * Response:
 * - narrationId: Narration identifier
 * - audioUrl: base64 data URL of generated audio
 * - text: The text used
 * - processingTimeMs: Time taken to generate
 */

import { NextRequest, NextResponse } from "next/server";
import type { NarrationGenerationRequest, NarrationGenerationResponse } from "@/types/narration";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice (default)
const DEFAULT_MODEL = "eleven_turbo_v2_5"; // Fast, high-quality model

export async function POST(request: NextRequest) {
  try {
    const body: NarrationGenerationRequest = await request.json();

    if (!body.narrationId || !body.text) {
      return NextResponse.json(
        { error: "narrationId and text are required" },
        { status: 400 }
      );
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const voiceId = body.voiceId || DEFAULT_VOICE_ID;
    const model = body.model || DEFAULT_MODEL;

    const startTime = Date.now();

    // Call ElevenLabs TTS API
    const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: body.text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate audio", details: errorText },
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
    const estimatedBitrateKbps = 128; // ElevenLabs typically uses 128kbps
    const estimatedDurationSeconds = (fileSizeBytes * 8) / (estimatedBitrateKbps * 1000);

    const result: NarrationGenerationResponse = {
      narrationId: body.narrationId,
      audioUrl,
      text: body.text,
      durationSeconds: estimatedDurationSeconds,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Narration generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate narration", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
