"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { Timeline as TimelineType, VideoClip, AudioClip } from "@/types/timeline";
import type { StoryboardShot } from "@/types/storyboard";
import type { MusicDuckingSettings } from "@/types/music";
import { useTimelineClips, getClipsAtTime } from "@/hooks/useTimelineClips";
import { isVideoClip, isAudioClip, isNarrationClip } from "@/types/timeline";

interface PreviewPlayerV2Props {
  timeline: TimelineType;
  shots: Record<string, StoryboardShot>;
  generatedVideos: Record<string, { videoUrl: string }>;
  generatedImages: Record<string, { imageUrl: string }>;
  generatedNarration: Record<string, { audioUrl: string }>;
  generatedMusic?: { audioUrl: string } | null;
  musicDuckingSettings?: MusicDuckingSettings;
  onTimeUpdate?: (time: number) => void;
  seekTime?: number;
}

export function PreviewPlayerV2({
  timeline,
  shots,
  generatedVideos,
  generatedImages,
  generatedNarration,
  generatedMusic,
  musicDuckingSettings,
  onTimeUpdate,
  seekTime,
}: PreviewPlayerV2Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const musicRef = useRef<HTMLAudioElement | null>(null);
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

  // Debug logging
  if (currentShot) {
    console.log('Current shot:', currentShot.id, 'Type:', currentShot.shotType, 'Has video:', !!videoUrl);
  }

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
      if (musicRef.current) {
        musicRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Create music audio element when music is available
  useEffect(() => {
    if (!generatedMusic?.audioUrl) {
      // Clean up if music is removed
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.src = '';
        musicRef.current = null;
      }
      return;
    }

    // Create music audio element
    if (!musicRef.current || musicRef.current.src !== generatedMusic.audioUrl) {
      if (musicRef.current) {
        musicRef.current.pause();
      }
      musicRef.current = new Audio(generatedMusic.audioUrl);
      musicRef.current.volume = musicDuckingSettings?.normalVolume ?? 0.3;
      musicRef.current.loop = false;
    }

    // Cleanup only when music changes or component unmounts
    return () => {
      if (musicRef.current) {
        musicRef.current.pause();
      }
    };
  }, [generatedMusic?.audioUrl, musicDuckingSettings?.normalVolume]);

  // Sync music playback to timeline
  useEffect(() => {
    if (!musicRef.current) return;

    const music = musicRef.current;

    if (isPlaying) {
      const drift = Math.abs(music.currentTime - currentTime);

      if (drift > SEEK_THRESHOLD_SECONDS) {
        music.currentTime = Math.max(0, Math.min(currentTime, music.duration || totalDuration));
      }

      if (music.paused) {
        music.play().catch(() => {
          // Ignore auto-play errors
        });
      }
    } else {
      music.pause();
    }
  }, [currentTime, isPlaying, totalDuration, SEEK_THRESHOLD_SECONDS]);

  // Audio ducking: smoothly adjust music volume based on narration
  useEffect(() => {
    if (!musicRef.current || !musicDuckingSettings?.enabled) {
      return;
    }

    const music = musicRef.current;
    const narrationClips = audioClips.filter(isNarrationClip);

    // Find if there's active or upcoming narration
    const LOOKAHEAD = 0.2; // Look ahead 0.2s to start ducking early
    const activeNarration = narrationClips.find(clip =>
      currentTime >= (clip.startTime - LOOKAHEAD) &&
      currentTime < clip.startTime + clip.duration
    );

    const targetVolume = activeNarration
      ? musicDuckingSettings.duckedVolume
      : musicDuckingSettings.normalVolume;

    // Smooth volume transition
    const currentVolume = music.volume;
    const volumeDiff = targetVolume - currentVolume;

    if (Math.abs(volumeDiff) > 0.01) {
      // Calculate step size based on fade duration
      // We want to complete the fade in fadeDuration seconds
      const fadeStepSize = volumeDiff / (musicDuckingSettings.fadeDuration * 60); // Assumes 60fps
      const newVolume = currentVolume + fadeStepSize;

      // Clamp to target to avoid overshooting
      if (volumeDiff > 0) {
        music.volume = Math.min(newVolume, targetVolume);
      } else {
        music.volume = Math.max(newVolume, targetVolume);
      }
    }
  }, [currentTime, audioClips, musicDuckingSettings]);

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

    // For UI clips (extracted videos), account for trimStart offset
    // UI clips are extracted from the source video, so they start at 0 in the extracted file
    // but we need to map timeline time to the extracted clip's internal time
    const videoTime = currentShot?.shotType === 'ui' && currentVideoClip.trimStart !== undefined
      ? timeIntoClip  // For extracted clips, timeIntoClip is already correct (relative to clip start)
      : timeIntoClip;

    if (isPlaying) {
      // Only seek if drift is significant (avoid constant seeking on every frame)
      const drift = Math.abs(videoRef.current.currentTime - videoTime);

      if (drift > SEEK_THRESHOLD_SECONDS) {
        console.log('Seeking video to:', videoTime, 'Current:', videoRef.current.currentTime, 'Drift:', drift);
        videoRef.current.currentTime = videoTime;
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
  }, [currentVideoClip, currentTime, isPlaying, videoUrl, currentShot, SEEK_THRESHOLD_SECONDS]);

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
