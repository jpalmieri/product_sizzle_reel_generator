import type { StoryboardResponse } from "@/types/storyboard";
import type { VideoAnalysisResponse } from "@/types/video-analysis";

export interface GenerateStoryboardRequest {
  productDescription: string;
  videoAnalyses?: Array<{
    videoId: string;
    overallDescription: string;
    duration: number;
    segments: Array<{
      startTime: number;
      endTime: number;
      description: string;
    }>;
  }>;
}

export async function generateStoryboard(
  productDescription: string,
  videoAnalyses: VideoAnalysisResponse[]
): Promise<StoryboardResponse> {
  const requestBody: GenerateStoryboardRequest = {
    productDescription: productDescription.trim(),
  };

  // Include video analyses if available
  if (videoAnalyses.length > 0) {
    requestBody.videoAnalyses = videoAnalyses.map(analysis => ({
      videoId: analysis.videoId,
      overallDescription: analysis.overallDescription,
      duration: analysis.duration,
      segments: analysis.segments,
    }));
  }

  const response = await fetch("/api/storyboard/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate storyboard");
  }

  return response.json();
}
