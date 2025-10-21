/**
 * Timeline Conversion Utilities
 *
 * Converts storyboard data to timeline clip architecture.
 * This allows backward compatibility with existing storyboard format
 * while enabling the new layer-based timeline editing.
 */

import type { StoryboardResponse, StoryboardShot, NarrationSegment } from '@/types/storyboard';
import type { Timeline, TimelineTrack, VideoClip, AudioClip } from '@/types/timeline';

/**
 * Calculate total video duration from storyboard shots
 * Used for music generation length parameter
 */
export function calculateStoryboardDuration(storyboard: StoryboardResponse): number {
  let totalDuration = 0;

  for (const shot of storyboard.shots) {
    const duration = shot.shotType === 'ui'
      ? (shot.endTime - shot.startTime)
      : 8; // cinematic shots are 8 seconds

    totalDuration += duration;
  }

  return totalDuration;
}

/**
 * Convert a storyboard to a timeline with clips
 */
export function storyboardToTimeline(storyboard: StoryboardResponse): Timeline {
  const videoTrack = createVideoTrack(storyboard.shots);
  const storyboardDuration = calculateStoryboardDuration(storyboard);
  const audioTrack = createAudioTrack(storyboard.narration || [], storyboard.musicPrompt, storyboardDuration);

  const tracks: TimelineTrack[] = [
    videoTrack,
    audioTrack,
  ].filter(track => track.clips.length > 0); // Only include non-empty tracks

  const totalDuration = calculateTotalDuration(tracks);

  return {
    tracks,
    totalDuration,
  };
}

/**
 * Create video track from storyboard shots
 * Shots are placed sequentially (cumulative timing)
 */
function createVideoTrack(shots: StoryboardShot[]): TimelineTrack {
  let cumulativeTime = 0;
  const videoClips: VideoClip[] = [];

  for (const shot of shots) {
    const duration = shot.shotType === 'ui'
      ? (shot.endTime - shot.startTime)
      : 8; // cinematic shots are 8 seconds

    const clip: VideoClip = {
      id: `video-${shot.id}`,
      type: 'video',
      shotId: shot.id,
      startTime: cumulativeTime,
      duration,
      ...(shot.shotType === 'ui' && {
        trimStart: shot.startTime,
        trimEnd: shot.endTime,
      }),
    };

    videoClips.push(clip);
    cumulativeTime += duration;
  }

  return {
    id: 'track-video',
    type: 'video',
    clips: videoClips,
  };
}

/**
 * Create audio track from narration segments and optional music
 * Narration uses absolute positioning from storyboard
 * Music placeholder uses storyboard duration (updated with actual after generation)
 */
function createAudioTrack(narration: NarrationSegment[], musicPrompt?: string, storyboardDuration?: number): TimelineTrack {
  const audioClips: AudioClip[] = narration.map(segment => ({
    id: `audio-${segment.id}`,
    type: 'audio' as const,
    audioType: 'narration' as const,
    sourceId: segment.id,
    text: segment.text,
    startTime: segment.startTime,
    duration: segment.endTime - segment.startTime,
  }));

  // Add placeholder music clip if music prompt exists
  // Uses storyboard duration as initial size, allows clicking before generation
  if (musicPrompt && storyboardDuration) {
    const musicClip: AudioClip = {
      id: 'music-background',
      type: 'audio' as const,
      audioType: 'music' as const,
      sourceId: 'background-music',
      startTime: 0,
      duration: storyboardDuration, // Use requested duration, will update with actual
      volume: 0.3,
    };
    audioClips.push(musicClip);
  }

  return {
    id: 'track-audio',
    type: 'audio',
    clips: audioClips,
  };
}

/**
 * Calculate total timeline duration from all tracks
 */
function calculateTotalDuration(tracks: TimelineTrack[]): number {
  let maxDuration = 0;

  for (const track of tracks) {
    for (const clip of track.clips) {
      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd > maxDuration) {
        maxDuration = clipEnd;
      }
    }
  }

  return maxDuration;
}

/**
 * Update narration clip duration based on actual audio duration
 * Called after narration audio is generated
 */
export function updateNarrationDuration(
  timeline: Timeline,
  narrationId: string,
  actualDuration: number
): Timeline {
  const updatedTracks = timeline.tracks.map(track => {
    if (track.type !== 'audio') return track;

    const updatedClips = track.clips.map(clip => {
      if (clip.type === 'audio' &&
          clip.audioType === 'narration' &&
          clip.sourceId === narrationId) {
        return {
          ...clip,
          duration: actualDuration,
        };
      }
      return clip;
    });

    return {
      ...track,
      clips: updatedClips,
    };
  });

  return {
    tracks: updatedTracks,
    totalDuration: calculateTotalDuration(updatedTracks),
  };
}

/**
 * Update clip position (for drag-and-drop)
 */
export function updateClipPosition(
  timeline: Timeline,
  clipId: string,
  newStartTime: number
): Timeline {
  const updatedTracks = timeline.tracks.map(track => ({
    ...track,
    clips: track.clips.map(clip =>
      clip.id === clipId
        ? { ...clip, startTime: Math.max(0, newStartTime) }
        : clip
    ),
  }));

  return {
    ...timeline,
    tracks: updatedTracks,
  };
}

/**
 * Update clip duration (for trimming)
 */
export function updateClipDuration(
  timeline: Timeline,
  clipId: string,
  newDuration: number
): Timeline {
  const updatedTracks = timeline.tracks.map(track => ({
    ...track,
    clips: track.clips.map(clip =>
      clip.id === clipId
        ? { ...clip, duration: Math.max(0.1, newDuration) } // Minimum 0.1s
        : clip
    ),
  }));

  return {
    tracks: updatedTracks,
    totalDuration: calculateTotalDuration(updatedTracks),
  };
}

/**
 * Add or update music clip in timeline
 * Updates duration of existing placeholder or creates new clip
 */
export function addMusicToTimeline(
  timeline: Timeline,
  musicDuration: number,
  startTime: number = 0
): Timeline {
  const updatedTracks = timeline.tracks.map(track => {
    if (track.type !== 'audio') return track;

    // Check if music clip already exists (placeholder from storyboard)
    const existingMusicClip = track.clips.find(
      clip => clip.type === 'audio' && clip.audioType === 'music'
    );

    if (existingMusicClip) {
      // Update existing placeholder with actual duration
      const updatedClips = track.clips.map(clip =>
        clip.type === 'audio' && clip.audioType === 'music'
          ? { ...clip, duration: musicDuration, startTime }
          : clip
      );

      return {
        ...track,
        clips: updatedClips,
      };
    } else {
      // No placeholder exists, add new music clip
      const musicClip: AudioClip = {
        id: 'music-background',
        type: 'audio' as const,
        audioType: 'music' as const,
        sourceId: 'background-music',
        startTime,
        duration: musicDuration,
        volume: 0.3,
      };

      return {
        ...track,
        clips: [...track.clips, musicClip],
      };
    }
  });

  return {
    tracks: updatedTracks,
    totalDuration: calculateTotalDuration(updatedTracks),
  };
}
