import type { VideoAnalysisResponse } from "@/types/video-analysis";

export interface AnalyzeVideoRequest {
  video: string;
  mimeType: string;
  videoId: string;
}

export interface ExtractClipRequest {
  shotId: string;
  videoData: string;
  startTime: number;
  endTime: number;
}

export interface ExtractClipResponse {
  shotId: string;
  videoUrl: string;
  processingTimeMs: number;
  timestamp: string;
}

export async function analyzeVideo(
  video: string,
  mimeType: string,
  videoId: string
): Promise<VideoAnalysisResponse> {
  const response = await fetch("/api/video/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video,
      mimeType,
      videoId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to analyze video");
  }

  return response.json();
}

export async function extractClip(
  shotId: string,
  videoData: string,
  startTime: number,
  endTime: number
): Promise<ExtractClipResponse> {
  const response = await fetch("/api/video/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shotId,
      videoData,
      startTime,
      endTime,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to extract clip");
  }

  return response.json();
}
