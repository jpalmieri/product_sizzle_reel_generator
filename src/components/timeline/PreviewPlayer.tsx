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
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const { items: shotTimeline, totalDuration } = useTimeline(shots);
  const currentShot = shotTimeline[currentShotIndex];

  // Get video URL for current shot (only cinematic shots for now)
  const videoUrl = currentShot.shot.shotType === 'cinematic'
    ? generatedVideos[currentShot.shot.id]?.videoUrl
    : undefined;

  const hasVideo = !!videoUrl;

  // Check if ANY shot has a video (for enabling controls)
  const hasAnyVideo = shotTimeline.some(({ shot }) =>
    shot.shotType === 'cinematic' && !!generatedVideos[shot.id]
  );

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
    } else if (currentShot.shot.shotType === 'ui') {
      // UI shot without video - auto-skip to next shot after brief delay
      const timer = setTimeout(() => {
        handleVideoEnded();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentShotIndex]);

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
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.pause();
              videoRef.current.load(); // Force reload the video
            }
          }}
          disabled={!hasAnyVideo}
          variant="outline"
        >
          Restart
        </Button>
        <Button onClick={handlePlayPause} disabled={!hasAnyVideo}>
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
