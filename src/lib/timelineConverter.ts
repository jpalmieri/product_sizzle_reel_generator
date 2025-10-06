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
 * Convert a storyboard to a timeline with clips
 */
export function storyboardToTimeline(storyboard: StoryboardResponse): Timeline {
  const videoTrack = createVideoTrack(storyboard.shots);
  const audioTrack = createAudioTrack(storyboard.narration || []);

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
 * Create audio track from narration segments
 * Narration uses absolute positioning from storyboard
 */
function createAudioTrack(narration: NarrationSegment[]): TimelineTrack {
  const audioClips: AudioClip[] = narration.map(segment => ({
    id: `audio-${segment.id}`,
    type: 'audio' as const,
    audioType: 'narration' as const,
    sourceId: segment.id,
    text: segment.text,
    startTime: segment.startTime,
    duration: segment.endTime - segment.startTime,
  }));

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
