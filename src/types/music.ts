/**
 * Request payload for generating background music with ElevenLabs Music API.
 */
export interface MusicGenerationRequest {
  prompt: string; // detailed music generation prompt
  durationMs: number; // requested music length in milliseconds
  modelId?: string; // ElevenLabs music model (defaults to 'music_v1')
}

/**
 * Response from music generation API containing the generated audio.
 */
export interface MusicGenerationResponse {
  audioUrl: string; // base64 data URL of the generated music
  prompt: string;
  requestedDurationMs: number; // what we asked for
  actualDurationSeconds: number; // actual duration from audio file metadata
  processingTimeMs: number;
  timestamp: string;
}

/**
 * Audio ducking configuration for background music
 */
export interface MusicDuckingSettings {
  enabled: boolean;
  normalVolume: number; // 0-1, volume when no narration
  duckedVolume: number; // 0-1, volume during narration
  fadeDuration: number; // seconds, fade in/out duration
}
