import type { Timeline } from "@/types/timeline";
import type { StillImageResponse } from "@/types/still-image";
import type { VideoGenerationResponse } from "@/types/video-generation";
import type { NarrationGenerationResponse } from "@/types/narration";
import type { MusicDuckingSettings } from "@/types/music";
import type { StoryboardResponse } from "@/types/storyboard";

export interface StitchVideoRequest {
  timeline: Timeline;
  shots: Record<string, StoryboardResponse['shots'][0]>;
  generatedVideos: Record<string, VideoGenerationResponse>;
  generatedImages: Record<string, StillImageResponse>;
}

export interface StitchVideoResponse {
  videoUrl: string;
}

export interface AssembleNarrationRequest {
  timeline: Timeline;
  generatedNarration: Record<string, NarrationGenerationResponse>;
  totalDuration: number;
}

export interface AssembleNarrationResponse {
  audioUrl: string;
}

export interface DuckMusicRequest {
  musicUrl: string;
  timeline: Timeline;
  duckingSettings: MusicDuckingSettings;
  totalDuration: number;
}

export interface DuckMusicResponse {
  audioUrl: string;
}

export interface AssembleFinalVideoRequest {
  videoUrl: string;
  narrationAudioUrl: string;
  musicAudioUrl: string;
}

export interface AssembleFinalVideoResponse {
  videoUrl: string;
}

export async function stitchVideoClips(
  timeline: Timeline,
  shots: Record<string, StoryboardResponse['shots'][0]>,
  generatedVideos: Record<string, VideoGenerationResponse>,
  generatedImages: Record<string, StillImageResponse>
): Promise<StitchVideoResponse> {
  const response = await fetch("/api/video/stitch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeline,
      shots,
      generatedVideos,
      generatedImages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to stitch video");
  }

  return response.json();
}

export async function assembleNarrationTrack(
  timeline: Timeline,
  generatedNarration: Record<string, NarrationGenerationResponse>,
  totalDuration: number
): Promise<AssembleNarrationResponse> {
  const response = await fetch("/api/audio/narration/assemble", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeline,
      generatedNarration,
      totalDuration,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to assemble narration");
  }

  return response.json();
}

export async function duckMusicTrack(
  musicUrl: string,
  timeline: Timeline,
  duckingSettings: MusicDuckingSettings,
  totalDuration: number
): Promise<DuckMusicResponse> {
  const response = await fetch("/api/audio/music/duck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      musicUrl,
      timeline,
      duckingSettings,
      totalDuration,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to duck music");
  }

  return response.json();
}

export async function assembleFinalVideo(
  videoUrl: string,
  narrationAudioUrl: string,
  musicAudioUrl: string
): Promise<AssembleFinalVideoResponse> {
  const response = await fetch("/api/video/assemble", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoUrl,
      narrationAudioUrl,
      musicAudioUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to assemble final video");
  }

  return response.json();
}
