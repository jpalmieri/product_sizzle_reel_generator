interface BaseShotInfo {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface CinematicShot extends BaseShotInfo {
  shotType: "cinematic";
  stillPrompt: string;
  videoPrompt: string;
}

export interface UIShot extends BaseShotInfo {
  shotType: "ui";
  uiDescription: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

export type StoryboardShot = CinematicShot | UIShot;

export interface NarrationSegment {
  id: string;
  text: string; // voiceover script text
  startTime: number; // when narration starts (in seconds)
  endTime: number; // when narration ends (in seconds)
}

export interface StoryboardResponse {
  title: string;
  description: string;
  shots: StoryboardShot[];
  narration?: NarrationSegment[]; // independent narration timeline
}

export interface StoryboardGenerationRequest {
  productDescription: string;
  videoAnalysis?: {
    overallDescription: string;
    duration: number;
    segments: Array<{
      startTime: number;
      endTime: number;
      description: string;
    }>;
  };
}