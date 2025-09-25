export interface StillImageGenerationRequest {
  prompt: string;
  shotId: string;
  baseImage?: string; // Base64 encoded image for image-to-image generation
}

export interface StillImageResponse {
  shotId: string;
  imageUrl: string;
  prompt: string;
  processingTimeMs: number;
  timestamp: string;
}