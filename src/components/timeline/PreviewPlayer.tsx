"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StoryboardShot, NarrationSegment } from "@/types/storyboard";
import { useTimeline } from "@/hooks/useTimeline";

interface PreviewPlayerProps {
  shots: StoryboardShot[];
  narration?: NarrationSegment[];
  generatedVideos: Record<string, { videoUrl: string }>;
  generatedNarration: Record<string, { audioUrl: string }>;
  onTimeUpdate?: (time: number) => void;
  seekTime?: number;
}

export function PreviewPlayer({
  shots,
  narration,
  generatedVideos,
  generatedNarration,
  onTimeUpdate,
  seekTime,
}: PreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const { items: shotTimeline, totalDuration } = useTimeline(shots);
  const currentShot = shotTimeline[currentShotIndex];

  // Get video URL for current shot (cinematic or extracted UI clips)
  const videoUrl = generatedVideos[currentShot.shot.id]?.videoUrl;

  const hasVideo = !!videoUrl;

  // Check if ANY shot has a video (for enabling controls)
  const hasAnyVideo = shotTimeline.some(({ shot }) =>
    !!generatedVideos[shot.id]
  );

  // Check if we have any narration audio
  const hasAnyNarration = narration && narration.length > 0 &&
    narration.some((segment) => !!generatedNarration[segment.id]);

  // Can play if we have video OR narration
  const canPlay = hasAnyVideo || hasAnyNarration;

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  // Handle narration audio playback based on currentTime
  useEffect(() => {
    if (!narration || narration.length === 0) return;

    narration.forEach((segment) => {
      const audioUrl = generatedNarration[segment.id]?.audioUrl;
      if (!audioUrl) return;

      // Get or create audio element
      let audio = audioRefs.current.get(segment.id);
      if (!audio) {
        audio = new Audio(audioUrl);
        audioRefs.current.set(segment.id, audio);
      }

      const isInTimeRange = currentTime >= segment.startTime;
      const isPlaying_local = !audio.paused;

      if (isPlaying && isInTimeRange) {
        // Calculate position within the narration segment
        const timeIntoNarration = currentTime - segment.startTime;
        const currentAudioTime = audio.currentTime;

        // Only seek if we're more than 0.5s off (avoid constant seeking during normal playback)
        if (Math.abs(currentAudioTime - timeIntoNarration) > 0.5) {
          audio.currentTime = timeIntoNarration;
        }

        // Start playing if we should and aren't already
        if (!isPlaying_local) {
          audio.play().catch(() => {
            // Ignore playback errors
          });
        }
      } else if (isPlaying_local && currentTime < segment.startTime) {
        // Only pause if we're before the start time (haven't reached this narration yet)
        audio.pause();
      }
    });
  }, [currentTime, isPlaying, narration, generatedNarration]);

  // Pause all narration when player pauses
  useEffect(() => {
    if (!isPlaying) {
      audioRefs.current.forEach((audio) => {
        audio.pause();
      });
    }
  }, [isPlaying]);

  // Handle seeking
  useEffect(() => {
    if (seekTime !== undefined && videoRef.current) {
      // Find which shot this time belongs to
      const shotIndex = shotTimeline.findIndex(
        (st) => seekTime >= st.startTime && seekTime < st.endTime
      );
      if (shotIndex !== -1 && shotIndex !== currentShotIndex) {
        setCurrentShotIndex(shotIndex);
        setCurrentTime(seekTime);
        // Seek within the video
        const timeInShot = seekTime - shotTimeline[shotIndex].startTime;
        videoRef.current.currentTime = timeInShot;
      }
    }
  }, [seekTime]);

  // Handle video time updates
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const timeInShot = videoRef.current.currentTime;
    const absoluteTime = currentShot.startTime + timeInShot;
    setCurrentTime(absoluteTime);
    onTimeUpdate?.(absoluteTime);

    // Check if we need to move to next shot
    if (timeInShot >= currentShot.duration) {
      handleVideoEnded();
    }
  };

  // Handle when video ends or shot duration is reached
  const handleVideoEnded = () => {
    if (currentShotIndex < shotTimeline.length - 1) {
      // Move to next shot
      setCurrentShotIndex(currentShotIndex + 1);
    } else {
      // End of all shots
      setIsPlaying(false);
    }
  };

  // Auto-play when switching to a new shot
  useEffect(() => {
    if (!isPlaying) return;

    if (hasVideo && videoRef.current) {
      // Has a video to play - only load if video source changed
      const currentSrc = videoRef.current.src;
      const newSrc = videoUrl;

      if (!currentSrc || currentSrc !== newSrc) {
        videoRef.current.load();
      }

      videoRef.current.play().catch(() => {
        // Ignore auto-play errors
        setIsPlaying(false);
      });
    } else {
      // No video for this shot (UI shot or cinematic without video) - simulate playback with timer
      const startTime = Date.now();
      const shotStartTime = currentShot.startTime;
      const shotDuration = currentShot.duration;

      const updateTimer = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTime = shotStartTime + elapsed;
        setCurrentTime(newTime);
        onTimeUpdate?.(newTime);

        if (elapsed >= shotDuration) {
          clearInterval(updateTimer);
          handleVideoEnded();
        }
      }, 100); // Update every 100ms

      return () => clearInterval(updateTimer);
    }
  }, [currentShotIndex, isPlaying]);

  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      // Play
      setIsPlaying(true);
      if (hasVideo && videoRef.current) {
        videoRef.current.play();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden max-w-3xl mx-auto aspect-video flex items-center justify-center">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-h-full max-w-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
          />
        ) : (
          <div className="text-center space-y-2">
            <p className="text-muted-foreground font-medium">
              {currentShot.shot.shotType === 'cinematic'
                ? 'Generate video for this shot to preview'
                : 'UI shot - extract clip to preview (coming soon)'}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={() => {
            setCurrentShotIndex(0);
            setCurrentTime(0);
            onTimeUpdate?.(0); // Update parent timeline immediately
            setIsPlaying(false);

            // Reset video
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.pause();
              videoRef.current.load(); // Force reload the video
            }

            // Reset all audio
            audioRefs.current.forEach((audio) => {
              audio.pause();
              audio.currentTime = 0;
            });
          }}
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

      <div className="text-center text-sm text-muted-foreground">
        Current: Shot {currentShot.shot.order} - {currentShot.shot.title}
      </div>
    </div>
  );
}
