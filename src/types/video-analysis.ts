/**
 * Represents one timestamped segment of the UI screen recording.
 * Example: { startTime: 5, endTime: 12, description: "User filters by location and company size" }
 */
export interface VideoAnalysisSegment {
  startTime: number; // in seconds
  endTime: number; // in seconds
  description: string; // what happens in this segment
}

/**
 * Complete analysis of the UI screen recording returned by Gemini.
 * Contains timestamped segments describing what happens when in the video,
 * which informs storyboard generation about when to use UI clips vs cinematic shots.
 */
export interface VideoAnalysisResponse {
  videoId: string; // identifies which uploaded video this analysis is for
  segments: VideoAnalysisSegment[];
  overallDescription: string;
  duration: number; // total video duration in seconds
  processingTimeMs: number;
  timestamp: string;
}

/**
 * Request payload for uploading a UI screen recording to be analyzed.
 * The video is sent as base64 encoded data.
 */
export interface VideoUploadRequest {
  video: string; // base64 encoded video data
  mimeType: string;
  videoId?: string; // optional identifier for the video
}

/**
 * Represents an uploaded video file in the UI.
 * Stores both original (for extraction) and compressed (for analysis) versions.
 */
export interface UploadedVideo {
  id: string;
  filename: string;
  originalData: string; // base64 data URL for clip extraction
  compressedData: string; // base64 data URL for analysis (may be same as original if <10MB)
  mimeType: string;
}
