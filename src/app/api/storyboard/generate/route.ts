import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import type { StoryboardResponse, StoryboardGenerationRequest } from "@/types/storyboard";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a creative director specializing in cinematic sizzle reels for software products and app features. Create compelling visual stories that showcase specific product functionality and user experience.`;

const generateStoryboardPrompt = (productDescription: string, videoAnalysis?: StoryboardGenerationRequest["videoAnalysis"]) => {
  const videoContext = videoAnalysis ? `

UI SCREEN RECORDING ANALYSIS:
The user has provided a ${videoAnalysis.duration}-second screen recording of the app feature. Here's what happens in it:

Overall: ${videoAnalysis.overallDescription}

Timestamped segments:
${videoAnalysis.segments.map(seg => `- ${seg.startTime}s-${seg.endTime}s: ${seg.description}`).join('\n')}

You can reference these specific UI moments by their timestamps when deciding to use UI shots.` : '';

  return `${SYSTEM_PROMPT}

Product Feature to Showcase: ${productDescription}${videoContext}

Create a cinematic storyboard for a sizzle reel with 4-6 shots that showcases THIS SPECIFIC PRODUCT FEATURE in action. The story should focus on demonstrating the feature's functionality, benefits, and user experience.

Build a simple narrative arc:
1. THE SETUP: User context or need that this feature addresses
2. THE FEATURE IN ACTION: Showing the specific functionality being used
3. THE BENEFIT: The positive outcome or value delivered by this feature

CONTEXT: This is for the Free World app - a portal helping formerly incarcerated individuals train for and find work in the trucking industry. Use this context to inform authentic settings and character circumstances, but keep the PRIMARY FOCUS on showcasing the specific product feature described above.

Focus on realistic, authentic settings - modest homes, community spaces, truck stops, training facilities, and other grounded environments. Avoid corporate or expensive locations.

SHOT TYPES:
Your storyboard should intelligently mix two types of shots based on what best tells the story:

1. CINEMATIC SHOTS (AI-generated): Human interaction, emotions, reactions
   - Do NOT show device screens or UI elements
   - Focus on: character emotions, natural device handling (typing, tapping, gesturing), body language, environmental context
   - Include "stillPrompt" and "videoPrompt" fields
   - Set "shotType": "cinematic"

2. UI SHOTS (from screen recording): Actual product functionality${videoAnalysis ? '' : ' (optional - only if UI recording is provided)'}
   - Show specific UI interactions from the screen recording
   - Include "uiDescription" describing what's shown
   - Include "startTime" and "endTime" timestamps (in seconds) from the recording
   - Set "shotType": "ui"

SHOT SELECTION STRATEGY:
Decide which shot type to use based on what best serves the story at each moment:
- Use CINEMATIC shots when human emotion, context, or reaction tells the story better
- Use UI shots when showing specific functionality or interface interaction is essential${videoAnalysis ? '' : ' (only if screen recording was provided)'}
- You may use multiple cinematic shots in a row if that serves the narrative
- You may use multiple UI shots in a row if demonstrating a complex workflow
- The goal is effective storytelling, not rigid patterns

The cinematic story should be told through human behavior, emotional beats, and environmental storytelling focused on THIS SPECIFIC FEATURE.

Return your response as a JSON object with this exact structure:
{
  "title": "Catchy title for the sizzle reel",
  "description": "Brief description of the overall visual concept and style",
  "shots": [
    {
      "id": "shot-1",
      "shotType": "cinematic",
      "title": "Shot title",
      "description": "What happens in this shot and why it's important",
      "stillPrompt": "Detailed prompt for generating a cinematic landscape still image...",
      "videoPrompt": "Detailed prompt for generating a cinematic video sequence...",
      "order": 1
    },
    {
      "id": "shot-2",
      "shotType": "ui",
      "title": "Shot title",
      "description": "What happens in this shot and why it's important",
      "uiDescription": "Description of what UI interaction to show",
      "startTime": 5.0,
      "endTime": 10.5,
      "order": 2
    }
  ]
}

For CINEMATIC shots, make the still and video prompts extremely detailed and cinematic, focusing on:

CINEMATIC PRODUCTION:
- Landscape orientation (16:9 aspect ratio)
- Professional camera work: specific lens choices (35mm, 50mm, 85mm), camera movements (dolly, crane, handheld)
- Advanced lighting: golden hour, blue hour, practical lighting, three-point lighting, rim lighting, dramatic shadows
- Depth of field: shallow focus, bokeh effects, foreground/background separation
- Composition: rule of thirds, leading lines, symmetry, negative space, framing within frame
- Color grading: warm/cool color temperature shifts for emotional beats, cinematic color palettes

VISUAL STORYTELLING:
- Human emotions, reactions, and body language that demonstrate the feature's value
- Natural device interaction (without showing screens) - typing, scrolling, gesturing, holding
- Environmental context that supports demonstrating this specific feature
- Authentic settings: modest homes, community centers, truck stops, training facilities, highways
- Technical cinematography details for AI generation: f-stop, focal length, lighting direction

VIDEO PRODUCTION GUIDELINES (IMPORTANT - ALL VIDEOS ARE 8 SECONDS):
- All generated videos will be exactly 8 seconds long
- Structure video prompts with TIMESTAMPS to control pacing and action timing
- Include specific timing for when key actions and emotional beats occur (e.g., "0:00-0:02 - character looks at phone, 0:02-0:05 - types message, 0:05-0:08 - smiles and looks up")
- Camera movements: smooth dolly, crane, handheld, slider, gimbal movements
- Transitions: how the shot should begin and end to flow into next shot
- Motion blur and depth changes throughout the sequence

VIDEO STORYTELLING:
- Character arc progression within the shot (emotional beats related to feature use)
- Natural progression of device interaction and reactions to the feature
- Environmental changes or reveals during the shot
- Subtle emotional shifts and micro-expressions showing feature impact
- Physical movement that supports demonstrating the feature
- How the shot advances the demonstration of this specific feature's value

IMPORTANT GUIDELINES FOR CINEMATIC SHOTS:
- Do NOT include descriptions of character appearance (hair color, clothing, facial features, etc.) - the visual appearance will be provided via reference image
- Do NOT show device screens, UI elements, or app interfaces in cinematic shots
- DO focus on human-device interaction: typing, tapping, holding, gesturing, scrolling
- DO emphasize character emotions and reactions that demonstrate this feature's impact and value
- DO include authentic environmental context that supports demonstrating this specific feature

STYLE GUARDRAILS (CRITICAL):
- Photorealistic only - no stylized, artistic, or abstract interpretations
- Neutral Rec.709 color grading - professional broadcast standard
- NO glam filters, Instagram-style effects, or beauty enhancement
- NO brand logos, product placement, or corporate branding visible
- NO dialogue, speech, talking, or lip-sync mouth movements
- NO audio, sound effects, music, or any sound generation
- Characters should NOT be speaking, singing, or making verbal sounds
- NO extra fingers, body warping, or anatomical distortions
- NO harsh, stylized color grading or heavy post-processing effects
- NO text overlays, subtitles, or graphics in the shots

NARRATIVE ARC REQUIREMENTS:
Each shot should build upon the previous one to tell a cohesive story that demonstrates this specific product feature's functionality and value. The progression should feel authentic, natural, and focused on showcasing the feature in action. Remember: the Free World context provides setting and authenticity, but the PRIMARY FOCUS is demonstrating the specific feature described in the product description.`;
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

    const prompt = generateStoryboardPrompt(body.productDescription, body.videoAnalysis);

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