/**
 * Request payload for generating narration audio with ElevenLabs TTS.
 */
export interface NarrationGenerationRequest {
  narrationId: string;
  text: string; // narration script text
  voiceId?: string; // ElevenLabs voice ID (optional, uses default if not provided)
  model?: string; // ElevenLabs model (e.g., 'eleven_turbo_v2_5')
}

/**
 * Response from narration generation API containing the generated audio.
 */
export interface NarrationGenerationResponse {
  narrationId: string;
  audioUrl: string; // base64 data URL of the generated audio
  text: string;
  durationSeconds: number; // actual duration of the generated audio file
  processingTimeMs: number;
  timestamp: string;
}

/**
 * Extended narration segment with generated audio.
 */
export interface NarrationSegmentWithAudio {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  audioUrl?: string; // populated after generation
}
