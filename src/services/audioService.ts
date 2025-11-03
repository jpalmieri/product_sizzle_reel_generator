import type { NarrationGenerationResponse } from "@/types/narration";
import type { MusicGenerationResponse } from "@/types/music";

export interface GenerateNarrationRequest {
  narrationId: string;
  text: string;
}

export interface GenerateMusicRequest {
  prompt: string;
  durationMs: number;
}

export async function generateNarration(
  narrationId: string,
  text: string
): Promise<NarrationGenerationResponse> {
  const response = await fetch("/api/narration/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      narrationId,
      text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate narration");
  }

  return response.json();
}

export async function generateMusic(
  prompt: string,
  durationMs: number
): Promise<MusicGenerationResponse> {
  const response = await fetch("/api/music/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      durationMs,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate music");
  }

  return response.json();
}
