export interface StillImageGenerationRequest {
  prompt: string;
  shotId: string;
  baseImage?: string; // Base64 encoded base reference image
  previousShots?: string[]; // Array of base64 encoded previously generated shot images
}

export interface StillImageResponse {
  shotId: string;
  imageUrl: string;
  prompt: string;
  processingTimeMs: number;
  timestamp: string;
}