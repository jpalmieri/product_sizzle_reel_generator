import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import type { StoryboardResponse, StoryboardGenerationRequest } from "@/types/storyboard";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a creative director specializing in cinematic sizzle reels for the Free World app - a portal helping formerly incarcerated individuals train for and find work in the trucking industry. Create authentic, dignified stories that represent this community with respect and showcase meaningful opportunities for second chances and career growth in professional trucking.`;

const generateStoryboardPrompt = (productDescription: string) => {
  return `${SYSTEM_PROMPT}

Product Description: ${productDescription}

Create a cinematic storyboard for a sizzle reel with 4-6 shots that tells a compelling story about formerly incarcerated individuals finding opportunity and hope through the Free World app's connection to trucking careers. Build a narrative arc that shows:

1. THE CHALLENGE: The difficulty of reentry and finding meaningful work
2. THE SOLUTION: Discovering opportunity through the Free World app
3. THE IMPACT: Progress, hope, and tangible career advancement in trucking

Focus on authentic, dignified representation in realistic settings - NOT corporate environments or expensive locations. Show modest homes, community spaces, truck stops, training facilities, and other authentic environments this community would recognize.

IMPORTANT: Do NOT show device screens, UI elements, or specific app interfaces in the shots. Instead, focus on:
- Character emotions and reactions while using the device (hope, determination, relief, progress)
- Natural device handling (typing, tapping, gesturing, holding, scrolling)
- Authentic environmental context (modest settings, trucking industry elements)
- Body language that conveys the life-changing impact of finding career opportunities
- Moments that show the Free World app solving real reentry challenges

The story should be told through human behavior, emotional beats, and environmental storytelling that resonates with the formerly incarcerated community and shows the dignity of second chances.

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
      "videoPrompt": "Detailed prompt for generating a cinematic video sequence from this shot. Describe camera movements, duration, timing, pacing, and how the scene unfolds over time. Include specific motion details and cinematographic techniques.",
      "order": 1
    }
  ]
}

Make the still prompts extremely detailed and cinematic, focusing on:

CINEMATIC PRODUCTION:
- Landscape orientation (16:9 aspect ratio)
- Professional camera work: specific lens choices (35mm, 50mm, 85mm), camera movements (dolly, crane, handheld)
- Advanced lighting: golden hour, blue hour, practical lighting, three-point lighting, rim lighting, dramatic shadows
- Depth of field: shallow focus, bokeh effects, foreground/background separation
- Composition: rule of thirds, leading lines, symmetry, negative space, framing within frame
- Color grading: warm/cool color temperature shifts for emotional beats, cinematic color palettes

VISUAL STORYTELLING:
- Human emotions, reactions, and body language that tell the story
- Natural device interaction (without showing screens) - typing, scrolling, gesturing, holding
- Environmental context that supports the Free World/trucking narrative
- Authentic settings: modest homes, community centers, truck stops, training facilities, highways
- Technical cinematography details for AI generation: f-stop, focal length, lighting direction

Make the video prompts extremely detailed and motion-focused, including:

VIDEO PRODUCTION GUIDELINES:
- Duration: 3-8 seconds per shot for sizzle reel pacing
- Camera movements: smooth dolly, crane, handheld, slider, gimbal movements
- Pacing: slow, contemplative moments vs dynamic action sequences as appropriate
- Timing: specific beats when key actions or emotions occur
- Transitions: how the shot should begin and end to flow into next shot
- Motion blur and depth changes throughout the sequence

VIDEO STORYTELLING:
- Character arc progression within the shot (emotional beats)
- Natural progression of device interaction and reactions
- Environmental changes or reveals during the shot
- Subtle emotional shifts and micro-expressions
- Physical movement that supports the narrative
- How the shot advances the overall Free World story

IMPORTANT GUIDELINES:
- Do NOT include descriptions of character appearance (hair color, clothing, facial features, etc.) - the visual appearance will be provided via reference image
- Do NOT show device screens, UI elements, or app interfaces in the shots
- DO focus on human-device interaction: typing, tapping, holding, gesturing, scrolling
- DO emphasize character emotions, reactions, and the life-changing impact of finding career opportunities
- DO include authentic environmental context that supports the Free World/trucking story

STYLE GUARDRAILS (CRITICAL):
- Photorealistic only - no stylized, artistic, or abstract interpretations
- Neutral Rec.709 color grading - professional broadcast standard
- NO glam filters, Instagram-style effects, or beauty enhancement
- NO brand logos, product placement, or corporate branding visible
- NO lip-sync mouth shapes or exaggerated facial expressions
- NO extra fingers, body warping, or anatomical distortions
- NO harsh, stylized color grading or heavy post-processing effects
- NO text overlays, subtitles, or graphics in the shots

NARRATIVE ARC REQUIREMENTS:
Each shot should build upon the previous one to tell a cohesive story about formerly incarcerated individuals finding hope and opportunity through trucking careers via the Free World app. The progression should feel authentic, dignified, and emotionally resonant while avoiding stereotypes or exploitation.`;
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