export interface StoryboardShot {
  id: string;
  title: string;
  description: string;
  stillPrompt: string;
  videoPrompt: string;
  order: number;
}

export interface StoryboardResponse {
  title: string;
  description: string;
  shots: StoryboardShot[];
}

export interface StoryboardGenerationRequest {
  productDescription: string;
}