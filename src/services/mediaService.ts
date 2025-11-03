import type { StillImageResponse } from "@/types/still-image";
import type { VideoGenerationResponse } from "@/types/video-generation";

export interface GenerateStillImageRequest {
  shotId: string;
  prompt: string;
  baseImage: string;
  previousShots: string[];
}

export interface GenerateVideoRequest {
  shotId: string;
  imageUrl: string;
  prompt: string;
  model: 'veo-2' | 'veo-3';
}

export async function generateStillImage(
  shotId: string,
  prompt: string,
  baseImage: string,
  previousShots: string[] = []
): Promise<StillImageResponse> {
  const response = await fetch("/api/images/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shotId,
      prompt,
      baseImage,
      previousShots,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate image");
  }

  return response.json();
}

export async function generateVideo(
  shotId: string,
  imageUrl: string,
  prompt: string,
  model: 'veo-2' | 'veo-3'
): Promise<VideoGenerationResponse> {
  const response = await fetch("/api/videos/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shotId,
      imageUrl,
      prompt,
      model,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate video");
  }

  return response.json();
}
