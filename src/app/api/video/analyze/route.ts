/**
 * Video Analysis API Route
 *
 * Accepts a UI screen recording and uses Gemini to analyze it, returning a timestamped
 * breakdown of what happens in the video. This analysis is then used by storyboard
 * generation to intelligently decide when to use UI clips vs cinematic shots.
 *
 * POST /api/video/analyze
 *
 * Request body:
 * - video: base64 encoded video data
 * - mimeType: video MIME type (e.g., "video/mp4")
 *
 * Response:
 * - segments: Array of timestamped segments with descriptions
 * - overallDescription: Summary of what the video shows
 * - duration: Total video duration in seconds
 * - processingTimeMs: Time taken to analyze
 *
 * Limitations:
 * - Max file size: 10MB (Gemini API limit)
 * - Recommended video length: under 60 seconds
 */

import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import type { VideoAnalysisResponse, VideoUploadRequest } from "@/types/video-analysis";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

const GEMINI_MODEL = "gemini-2.5-flash";

// File size limit: 10MB (Gemini API limitation)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const VIDEO_ANALYSIS_PROMPT = `Analyze this UI screen recording of a mobile app feature. Provide an accurate, timestamped breakdown of what happens in the video.

IMPORTANT ACCURACY GUIDELINES:
- Only describe what you ACTUALLY SEE on screen
- Do NOT infer, assume, or imagine actions that aren't clearly visible
- If you can't clearly see what's happening, describe it more generally (e.g., "user interacts with screen" instead of "user taps search button")
- Be conservative - it's better to have fewer, accurate segments than many detailed but inaccurate ones
- Focus on visible UI changes, screen transitions, and clearly observable interactions

For each distinct action or screen change that you can clearly see, create a segment with:
- Start time (in seconds, as a number)
- End time (in seconds, as a number)
- Clear, factual description of what's visible on screen

Also provide:
- An overall summary of what the video demonstrates (only what's actually visible)
- Total video duration (in seconds, as a number)

TIMESTAMP FORMAT REQUIREMENTS:
- All times must be numeric values (not strings)
- Use decimal seconds (e.g., 5.5, 10.2, not "5s" or "5.5s")
- startTime and endTime must be numbers
- duration must be a number

Return your response as a JSON object with this exact structure:
{
  "overallDescription": "Brief summary of what the video shows",
  "duration": 30.5,
  "segments": [
    {
      "startTime": 0,
      "endTime": 5,
      "description": "User opens app and navigates to feature"
    },
    {
      "startTime": 5,
      "endTime": 12.5,
      "description": "User interacts with main feature"
    }
  ]
}

Remember: Accuracy over detail. Only describe what you actually see.`;

export async function POST(request: NextRequest) {
  try {
    const body: VideoUploadRequest = await request.json();

    if (!body.video || !body.mimeType) {
      return NextResponse.json(
        { error: "Video data and mimeType are required" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Google AI API key not configured" },
        { status: 500 }
      );
    }

    // Extract base64 data (remove data URL prefix if present)
    let base64Data = body.video;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    // Validate file size (base64 is ~33% larger than original, so decode to check actual size)
    const fileSizeBytes = (base64Data.length * 3) / 4;
    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `Video file too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB. Please trim your video to under 60 seconds or compress it.`,
          fileSizeMB: (fileSizeBytes / 1024 / 1024).toFixed(2)
        },
        { status: 413 }
      );
    }

    const startTime = Date.now();

    // Send video to Gemini for analysis
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: VIDEO_ANALYSIS_PROMPT },
        {
          inlineData: {
            mimeType: body.mimeType,
            data: base64Data
          }
        }
      ],
    });

    const processingTimeMs = Date.now() - startTime;

    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json(
        { error: "No response generated from Gemini" },
        { status: 500 }
      );
    }

    const responseText = response.candidates[0].content.parts[0].text;

    // Parse the JSON response - handle markdown code blocks
    let analysis: Omit<VideoAnalysisResponse, "processingTimeMs" | "timestamp">;
    try {
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      analysis = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json(
        { error: "Failed to analyze video" },
        { status: 500 }
      );
    }

    const result: VideoAnalysisResponse = {
      ...analysis,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Video analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze video" },
      { status: 500 }
    );
  }
}
