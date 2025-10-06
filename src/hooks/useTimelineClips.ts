import { useMemo } from "react";
import type { Timeline, TimelineClip, TimelineTrack, PositionedClip } from "@/types/timeline";

/**
 * Hook for working with timeline clips
 * Provides positioned clips and utilities for the new layer-based timeline
 */
export function useTimelineClips(timeline: Timeline) {
  const result = useMemo(() => {
    // Get all clips across all tracks with their positions
    const allClips: PositionedClip[] = [];

    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        allClips.push({
          clip,
          startTime: clip.startTime,
          endTime: clip.startTime + clip.duration,
          duration: clip.duration,
        });
      }
    }

    // Sort by start time for sequential playback
    allClips.sort((a, b) => a.startTime - b.startTime);

    // Get clips by track type for rendering
    const videoTrack = timeline.tracks.find(t => t.type === 'video');
    const audioTrack = timeline.tracks.find(t => t.type === 'audio');

    const videoClips = videoTrack?.clips || [];
    const audioClips = audioTrack?.clips || [];

    return {
      allClips,              // All clips sorted by time
      videoClips,            // Video track clips
      audioClips,            // Audio track clips
      totalDuration: timeline.totalDuration,
      tracks: timeline.tracks,
    };
  }, [timeline]);

  return result;
}

/**
 * Get the clip that should be playing at a given time
 */
export function getClipAtTime(clips: PositionedClip[], time: number): PositionedClip | null {
  return clips.find(c => time >= c.startTime && time < c.endTime) || null;
}

/**
 * Get all clips playing at a given time (for overlapping audio/video)
 */
export function getClipsAtTime(clips: PositionedClip[], time: number): PositionedClip[] {
  return clips.filter(c => time >= c.startTime && time < c.endTime);
}

/**
 * Check if two clips overlap in time
 */
export function clipsOverlap(clip1: TimelineClip, clip2: TimelineClip): boolean {
  const end1 = clip1.startTime + clip1.duration;
  const end2 = clip2.startTime + clip2.duration;

  return (
    (clip1.startTime >= clip2.startTime && clip1.startTime < end2) ||
    (clip2.startTime >= clip1.startTime && clip2.startTime < end1)
  );
}
