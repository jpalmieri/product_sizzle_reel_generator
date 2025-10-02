/**
 * Request payload for generating a video from a still image using Gemini Veo.
 * Combines the generated still image with a motion prompt to create a video clip.
 */
export interface VideoGenerationRequest {
  shotId: string;
  imageUrl: string; // base64 data URL of the still image
  prompt: string; // motion/video prompt describing the desired animation
  model?: 'veo-2' | 'veo-3'; // Which Veo model to use (default: veo-2)
}

/**
 * Response from video generation API containing the generated video.
 */
export interface VideoGenerationResponse {
  shotId: string;
  videoUrl: string; // base64 data URL of the generated video
  prompt: string;
  processingTimeMs: number;
  timestamp: string;
}
