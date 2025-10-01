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

export interface StoryboardResponse {
  title: string;
  description: string;
  shots: StoryboardShot[];
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