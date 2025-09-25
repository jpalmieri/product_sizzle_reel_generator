import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import type { StoryboardResponse, StoryboardGenerationRequest } from "@/types/storyboard";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

const GEMINI_MODEL = "gemini-1.5-flash";

const SYSTEM_PROMPT = `You are a creative director specializing in cinematic sizzle reels for software products. Your job is to create compelling visual storyboards that showcase product features in an engaging, cinematic way.`;

const generateStoryboardPrompt = (productDescription: string) => {
  return `${SYSTEM_PROMPT}

Product Description: ${productDescription}

Create a cinematic storyboard for a sizzle reel with 4-6 shots that would effectively showcase this product. Focus on visual storytelling that highlights the product's key features and benefits.

Return your response as a JSON object with this exact structure:
{
  "title": "Catchy title for the sizzle reel",
  "description": "Brief description of the overall visual concept and style",
  "shots": [
    {
      "id": "shot-1",
      "title": "Shot title",
      "description": "What happens in this shot and why it's important",
      "stillPrompt": "Detailed prompt for generating a cinematic landscape still image for this shot. Include specific details about composition, lighting, mood, colors, and visual style. Make it highly detailed and specific for AI image generation.",
      "order": 1
    }
  ]
}

Make the still prompts extremely detailed and cinematic, focusing on:
- Landscape orientation (16:9 aspect ratio)
- Professional lighting and composition
- Modern, clean visual style
- Specific camera angles and framing
- Color palette and mood
- Technical details that would help an AI generate a compelling image

Each shot should build upon the previous one to tell a cohesive visual story about the product.`;
};

export async function POST(request: NextRequest) {
  try {
    const body: StoryboardGenerationRequest = await request.json();

    if (!body.productDescription) {
      return NextResponse.json(
        { error: "Product description is required" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Google AI API key not configured" },
        { status: 500 }
      );
    }

    const prompt = generateStoryboardPrompt(body.productDescription);

    const startTime = Date.now();
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
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
    let storyboard: StoryboardResponse;
    try {
      // Remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      storyboard = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json(
        { error: "Failed to generate valid storyboard" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...storyboard,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Storyboard generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}