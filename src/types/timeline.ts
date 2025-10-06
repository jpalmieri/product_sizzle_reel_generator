/**
 * Timeline Clip Architecture
 *
 * This file defines a layer-based timeline where each track contains
 * independently positioned clips. This separates timeline positioning
 * from source assets, enabling flexible editing.
 */

export type ClipType = 'video' | 'audio';
export type AudioType = 'narration' | 'music' | 'sfx' | 'ambient';

/**
 * Base clip interface - all clips share these properties
 */
export interface BaseClip {
  id: string;
  type: ClipType;
  startTime: number;  // Absolute position on timeline (seconds)
  duration: number;   // How long the clip plays (seconds)
}

/**
 * Video clip - references a shot from the storyboard
 */
export interface VideoClip extends BaseClip {
  type: 'video';
  shotId: string;           // Reference to StoryboardShot
  trimStart?: number;       // Offset into source video (for UI shots)
  trimEnd?: number;         // End offset into source video (for UI shots)
}

/**
 * Audio clip - unified type for all audio (narration, music, sfx, etc.)
 * Uses discriminated union for type-safe audio type handling
 */
export type AudioClip =
  | {
      type: 'audio';
      audioType: 'narration';
      id: string;
      startTime: number;
      duration: number;
      sourceId: string;       // Reference to NarrationSegment
      text: string;           // Narration text
      volume?: number;        // Volume level (0-1, default 1)
    }
  | {
      type: 'audio';
      audioType: 'music';
      id: string;
      startTime: number;
      duration: number;
      sourceId: string;       // Reference to music asset
      volume?: number;        // Volume level (0-1, default 1)
      fadeIn?: number;        // Fade in duration (seconds)
      fadeOut?: number;       // Fade out duration (seconds)
    }
  | {
      type: 'audio';
      audioType: 'sfx' | 'ambient';
      id: string;
      startTime: number;
      duration: number;
      sourceId: string;       // Reference to audio asset
      volume?: number;        // Volume level (0-1, default 1)
    };

/**
 * Union type for all clip types
 */
export type TimelineClip = VideoClip | AudioClip;

/**
 * Timeline track - contains clips of a specific type
 */
export interface TimelineTrack {
  id: string;
  type: ClipType;
  clips: TimelineClip[];
}

/**
 * Complete timeline - multiple tracks
 */
export interface Timeline {
  tracks: TimelineTrack[];
  totalDuration: number;    // Calculated from all clips
}

/**
 * Helper type for rendering - clip with calculated end time
 */
export interface PositionedClip {
  clip: TimelineClip;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Type guards for safe type narrowing
 */
export function isVideoClip(clip: TimelineClip): clip is VideoClip {
  return clip.type === 'video';
}

export function isAudioClip(clip: TimelineClip): clip is AudioClip {
  return clip.type === 'audio';
}

export function isNarrationClip(clip: TimelineClip): clip is AudioClip & { audioType: 'narration' } {
  return clip.type === 'audio' && clip.audioType === 'narration';
}

export function isMusicClip(clip: TimelineClip): clip is AudioClip & { audioType: 'music' } {
  return clip.type === 'audio' && clip.audioType === 'music';
}
