"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { Timeline as TimelineType, VideoClip, AudioClip } from "@/types/timeline";
import type { StoryboardShot } from "@/types/storyboard";
import { useTimelineClips, getClipsAtTime } from "@/hooks/useTimelineClips";
import { isVideoClip, isAudioClip } from "@/types/timeline";

interface PreviewPlayerV2Props {
  timeline: TimelineType;
  shots: Record<string, StoryboardShot>;
  generatedVideos: Record<string, { videoUrl: string }>;
  generatedImages: Record<string, { imageUrl: string }>;
  generatedNarration: Record<string, { audioUrl: string }>;
  onTimeUpdate?: (time: number) => void;
  seekTime?: number;
}

export function PreviewPlayerV2({
  timeline,
  shots,
  generatedVideos,
  generatedImages,
  generatedNarration,
  onTimeUpdate,
  seekTime,
}: PreviewPlayerV2Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number>();

  const { allClips, videoClips, audioClips, totalDuration } = useTimelineClips(timeline);

  const SEEK_THRESHOLD_SECONDS = 0.5;

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Clear audio cache when generatedNarration changes (e.g., new storyboard)
  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    audioRefs.current.clear();
  }, [generatedNarration]);

  // Find current video clip
  const currentVideoClip = videoClips.find(
    clip => isVideoClip(clip) && currentTime >= clip.startTime && currentTime < (clip.startTime + clip.duration)
  ) as VideoClip | undefined;

  const currentShot = currentVideoClip ? shots[currentVideoClip.shotId] : null;
  const videoUrl = currentShot ? generatedVideos[currentShot.id]?.videoUrl : null;
  const stillUrl = currentShot?.shotType === 'cinematic'
    ? generatedImages[currentShot.id]?.imageUrl
    : null;

  // Helper: Get or create audio element
  const getOrCreateAudio = useCallback((clip: AudioClip): HTMLAudioElement | null => {
    const audioUrl = generatedNarration[clip.sourceId]?.audioUrl;
    if (!audioUrl) return null;

    let audio = audioRefs.current.get(clip.id);
    if (!audio) {
      audio = new Audio(audioUrl);
      audioRefs.current.set(clip.id, audio);
    }
    return audio;
  }, [generatedNarration]);

  // Helper: Sync audio to timeline
  const syncAudioToTimeline = useCallback((audio: HTMLAudioElement, clip: AudioClip) => {
    const timeIntoClip = currentTime - clip.startTime;
    const isInTimeRange = currentTime >= clip.startTime && currentTime < (clip.startTime + clip.duration);
    const audioIsPlaying = !audio.paused;

    const audioDuration = audio.duration;
    const hasAudioFinished = !isNaN(audioDuration) && timeIntoClip >= audioDuration;

    if (isPlaying && isInTimeRange && !hasAudioFinished) {
      const drift = Math.abs(audio.currentTime - timeIntoClip);

      if (drift > SEEK_THRESHOLD_SECONDS) {
        audio.currentTime = timeIntoClip;
      }

      if (!audioIsPlaying) {
        audio.play().catch(() => {
          // Ignore auto-play errors
        });
      }
    } else if (audioIsPlaying) {
      audio.pause();
    }
  }, [currentTime, isPlaying, SEEK_THRESHOLD_SECONDS]);

  // Handle audio playback
  useEffect(() => {
    audioClips.forEach((clip) => {
      if (!isAudioClip(clip)) return;

      const audio = getOrCreateAudio(clip);
      if (!audio) return;

      syncAudioToTimeline(audio, clip);
    });
  }, [audioClips, currentTime, isPlaying, getOrCreateAudio, syncAudioToTimeline]);

  // Pause all audio when not playing
  useEffect(() => {
    if (!isPlaying) {
      audioRefs.current.forEach((audio) => {
        audio.pause();
      });
    }
  }, [isPlaying]);

  // Handle seeking
  useEffect(() => {
    if (seekTime !== undefined) {
      setCurrentTime(seekTime);
      if (videoRef.current && currentVideoClip) {
        const timeIntoClip = seekTime - currentVideoClip.startTime;
        videoRef.current.currentTime = Math.max(0, timeIntoClip);
      }
    }
  }, [seekTime, currentVideoClip]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp = performance.now();

    const tick = (timestamp: number) => {
      const deltaTime = (timestamp - lastTimestamp) / 1000; // Convert to seconds
      lastTimestamp = timestamp;

      setCurrentTime(prev => {
        const newTime = prev + deltaTime;

        if (newTime >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }

        return newTime;
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  // Notify parent of time updates
  useEffect(() => {
    onTimeUpdate?.(currentTime);
  }, [currentTime, onTimeUpdate]);

  // Sync video playback to current video clip
  useEffect(() => {
    if (!videoRef.current || !currentVideoClip || !videoUrl) return;

    const timeIntoClip = currentTime - currentVideoClip.startTime;
    const videoIsPlaying = !videoRef.current.paused;

    if (isPlaying) {
      // Only seek if drift is significant (avoid constant seeking on every frame)
      const drift = Math.abs(videoRef.current.currentTime - timeIntoClip);

      if (drift > SEEK_THRESHOLD_SECONDS) {
        videoRef.current.currentTime = timeIntoClip;
      }

      if (!videoIsPlaying) {
        videoRef.current.play().catch(() => {
          // Ignore auto-play errors
        });
      }
    } else {
      if (videoIsPlaying) {
        videoRef.current.pause();
      }
    }
  }, [currentVideoClip, currentTime, isPlaying, videoUrl, SEEK_THRESHOLD_SECONDS]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    onTimeUpdate?.(0);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }

    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const canPlay = videoClips.length > 0 || audioClips.length > 0;

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden max-w-3xl mx-auto aspect-video flex items-center justify-center">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-h-full max-w-full object-contain"
            muted
          />
        ) : stillUrl ? (
          <img
            src={stillUrl}
            alt={`Shot ${currentShot?.order}: ${currentShot?.title}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-center space-y-2">
            <p className="text-muted-foreground font-medium">
              {currentShot?.shotType === 'cinematic'
                ? 'Generate still or video for this shot to preview'
                : 'No video clip at this time'}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={handleRestart}
          disabled={!canPlay}
          variant="outline"
        >
          Restart
        </Button>
        <Button onClick={handlePlayPause} disabled={!canPlay}>
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <span className="text-sm text-muted-foreground font-mono">
          {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
        </span>
      </div>

      {currentShot && (
        <div className="text-center text-sm text-muted-foreground">
          Current: Shot {currentShot.order} - {currentShot.title}
        </div>
      )}
    </div>
  );
}
