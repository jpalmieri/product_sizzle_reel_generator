/**
 * Video Generation API Route
 *
 * Generates video clips from still images using Google Gemini Veo 2.
 * Takes a still image and motion prompt to create an animated video clip.
 *
 * POST /api/videos/generate
 *
 * Request body:
 * - shotId: Unique identifier for the shot
 * - imageUrl: base64 data URL of the still image
 * - prompt: Motion/video prompt describing desired animation
 *
 * Response:
 * - shotId: Shot identifier
 * - videoUrl: base64 data URL of generated video
 * - prompt: The prompt used
 * - processingTimeMs: Time taken to generate
 *
 * Notes:
 * - Uses Veo 2.0 model (veo-2.0-generate-001)
 * - Generates 720p, 24fps video up to 8 seconds
 * - Cost: $0.35/second
 * - Videos are stored on server for 2 days only
 */

import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import type { VideoGenerationRequest, VideoGenerationResponse } from "@/types/video-generation";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

const VEO_MODELS = {
  'veo-2': 'veo-2.0-generate-001',
  'veo-3': 'veo-3.0-generate-001',
} as const;

const POLL_INTERVAL_MS = 20000; // Poll every 20 seconds
const MAX_POLL_ATTEMPTS = 30; // Max 10 minutes (30 * 20s)

export async function POST(request: NextRequest) {
  try {
    const body: VideoGenerationRequest = await request.json();

    if (!body.shotId || !body.imageUrl || !body.prompt) {
      return NextResponse.json(
        { error: "shotId, imageUrl, and prompt are required" },
        { status: 400 }
      );
    }

    // Select model (default to veo-2)
    const selectedModel = body.model || 'veo-2';
    const modelId = VEO_MODELS[selectedModel];

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Google AI API key not configured" },
        { status: 500 }
      );
    }

    // Extract base64 data from data URL
    const [mimeTypePart, base64Data] = body.imageUrl.split(',');
    const mimeType = mimeTypePart.match(/data:([^;]+)/)?.[1] || 'image/png';

    const startTime = Date.now();

    // Start video generation operation
    const operation = await genAI.models.generateVideos({
      model: modelId,
      prompt: body.prompt,
      image: {
        imageBytes: base64Data,
        mimeType: mimeType as 'image/png' | 'image/jpeg',
      },
      config: {
        personGeneration: 'allow_adult',
        aspectRatio: '16:9',
      },
    });

    console.log('Operation created successfully:', operation);
    console.log('Operation name:', operation?.name);
    console.log('Operation type:', typeof operation);

    if (!operation?.name) {
      console.error('Invalid operation response:', operation);
      return NextResponse.json(
        { error: "Failed to start video generation operation" },
        { status: 500 }
      );
    }

    const operationName = operation.name;
    console.log('Stored operation name:', operationName);
    console.log('genAI.operations:', genAI.operations);
    console.log('genAI keys:', Object.keys(genAI));

    // Poll for completion
    let attempts = 0;
    let currentOperation = operation;

    while (!currentOperation.done && attempts < MAX_POLL_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      currentOperation = await genAI.operations.getVideosOperation({ operation: currentOperation });
      attempts++;
    }

    if (!currentOperation.done) {
      return NextResponse.json(
        { error: "Video generation timed out. Please try again." },
        { status: 408 }
      );
    }

    if (!currentOperation.response?.generatedVideos?.[0]?.video) {
      return NextResponse.json(
        { error: "No video generated" },
        { status: 500 }
      );
    }

    const processingTimeMs = Date.now() - startTime;

    // Download the generated video from URI
    const generatedVideo = currentOperation.response.generatedVideos[0];
    const videoUri = generatedVideo.video.uri;

    // Fetch the video data directly from the URI with API key authentication
    const videoResponse = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY!,
      },
    });
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    // Convert video to base64 data URL
    const videoBuffer = await videoResponse.arrayBuffer();
    const videoBase64 = Buffer.from(videoBuffer).toString('base64');
    const videoUrl = `data:video/mp4;base64,${videoBase64}`;

    const result: VideoGenerationResponse = {
      shotId: body.shotId,
      videoUrl,
      prompt: body.prompt,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate video", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
