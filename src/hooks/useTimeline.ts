import { useMemo } from "react";
import { StoryboardShot } from "@/types/storyboard";

export interface ShotTimelineItem {
  shot: StoryboardShot;
  duration: number;
  startTime: number;
  endTime: number;
}

/**
 * Calculate timeline positions and durations for all shots.
 * This centralizes the timeline calculation logic used by both
 * the Timeline component and PreviewPlayer.
 */
export function useTimeline(shots: StoryboardShot[]) {
  const timeline = useMemo(() => {
    let cumulativeTime = 0;

    const items: ShotTimelineItem[] = shots.map((shot) => {
      const startTime = cumulativeTime;
      const duration = shot.shotType === 'ui'
        ? shot.endTime - shot.startTime
        : 8; // cinematic shots are 8 seconds

      cumulativeTime += duration;

      return {
        shot,
        duration,
        startTime,
        endTime: startTime + duration,
      };
    });

    return {
      items,
      totalDuration: cumulativeTime,
    };
  }, [shots]);

  return timeline;
}
