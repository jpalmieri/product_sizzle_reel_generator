import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import type { StillImageResponse, StillImageGenerationRequest } from "@/types/still-image";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

const GEMINI_MODEL = "gemini-2.5-flash-image-preview";
const DEFAULT_MIME_TYPE = "image/png";

// Helper function to create data URL from image data
const createDataUrl = (imageData: string, mimeType: string): string => {
  return `data:${mimeType};base64,${imageData}`;
};

// Helper function to process Gemini response and extract image data
const processGeminiResponse = async (response: any) => {
  if (response.candidates && response.candidates[0]) {
    const candidate = response.candidates[0];

    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        // Check if this part contains image data
        if (part.inlineData && part.inlineData.data) {
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || DEFAULT_MIME_TYPE;

          // Create data URL from image data
          return createDataUrl(imageData, mimeType);
        }
      }
    }
  }

  return null;
};

export async function POST(request: NextRequest) {
  try {
    const body: StillImageGenerationRequest = await request.json();

    if (!body.prompt || !body.shotId || !body.baseImage) {
      return NextResponse.json(
        { error: "Prompt, shotId, and baseImage are required" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Google AI API key not configured" },
        { status: 500 }
      );
    }

    let contextDescription = ' Reference images provided: base character/product image';
    if (body.previousShots && body.previousShots.length > 0) {
      contextDescription += ` plus ${body.previousShots.length} previous shot(s) for visual continuity`;
    }
    contextDescription += '.';

    const enhancedPrompt = `Generate a professional, cinematic still image based on this description. The image should be in landscape orientation (16:9 aspect ratio) and suitable for a high-quality sizzle reel.

${body.prompt}

Make this visually stunning, professional, and cinematic in quality.${contextDescription}`;

    const startTime = Date.now();

    // Build the content array - include all reference images
    const contents: any[] = [{ text: enhancedPrompt }];

    // Add base image (required)
    const [mimeTypePart, base64Data] = body.baseImage.split(',');
    const mimeType = mimeTypePart.match(/data:([^;]+)/)?.[1] || DEFAULT_MIME_TYPE;

    contents.push({
      inlineData: {
        mimeType,
        data: base64Data
      }
    });

    // Add previous shots if provided
    if (body.previousShots && body.previousShots.length > 0) {
      body.previousShots.forEach((shotImage) => {
        const [mimeTypePart, base64Data] = shotImage.split(',');
        const mimeType = mimeTypePart.match(/data:([^;]+)/)?.[1] || DEFAULT_MIME_TYPE;

        contents.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      });
    }

    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents,
    });

    const processingTimeMs = Date.now() - startTime;

    const imageUrl = await processGeminiResponse(response);

    if (!imageUrl) {
      console.error("No image generated in Gemini response");
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    const result: StillImageResponse = {
      shotId: body.shotId,
      imageUrl,
      prompt: body.prompt,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Still image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate still image" },
      { status: 500 }
    );
  }
}