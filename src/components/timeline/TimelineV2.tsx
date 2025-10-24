"use client";

import { useState, useRef } from "react";
import type { Timeline as TimelineType, VideoClip, AudioClip } from "@/types/timeline";
import type { StoryboardShot } from "@/types/storyboard";
import { useTimelineClips } from "@/hooks/useTimelineClips";
import { isVideoClip, isAudioClip, isNarrationClip, isMusicClip } from "@/types/timeline";

interface TimelineV2Props {
  timeline: TimelineType;
  shots: Record<string, StoryboardShot>; // Lookup by shot ID
  currentTime?: number;
  onSeek?: (time: number) => void;
  generatedVideos?: Record<string, { videoUrl: string }>;
  generatedImages?: Record<string, { imageUrl: string }>;
  generatedNarration?: Record<string, { audioUrl: string }>;
  generatedMusic?: { audioUrl: string } | null;
  selectedClipId?: string | null;
  onSelectClip?: (clipId: string) => void;
  onClipPositionChange?: (clipId: string, newStartTime: number) => void;
}

export function TimelineV2({
  timeline,
  shots,
  currentTime = 0,
  onSeek,
  generatedVideos = {},
  generatedImages = {},
  generatedNarration = {},
  selectedClipId,
  onSelectClip,
  onClipPositionChange,
}: TimelineV2Props) {
  const { videoClips, audioClips, totalDuration } = useTimelineClips(timeline);

  // Separate narration and music clips
  const narrationClips = audioClips.filter(isNarrationClip);
  const musicClips = audioClips.filter(isMusicClip);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const time = (x / width) * totalDuration;
    onSeek(Math.max(0, Math.min(time, totalDuration)));
  };

  const handleClipDragStart = (e: React.MouseEvent<HTMLDivElement>, clip: AudioClip) => {
    if (!onClipPositionChange) return;
    e.stopPropagation();
    setDraggingClipId(clip.id);
    setDragStartX(e.clientX);
    setDragStartTime(clip.startTime);
  };

  const handleClipDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingClipId || !timelineRef.current || !onClipPositionChange) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX;
    const deltaTime = (deltaX / rect.width) * totalDuration;
    const newStartTime = Math.max(0, Math.min(dragStartTime + deltaTime, totalDuration));

    onClipPositionChange(draggingClipId, newStartTime);
  };

  const handleClipDragEnd = () => {
    setDraggingClipId(null);
  };

  return (
    <div className="space-y-2 w-full max-w-4xl">
      {/* Time markers */}
      <div className="relative w-full">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => (
            <span key={i} className="font-mono">{(i * 5).toFixed(0)}s</span>
          ))}
        </div>
      </div>

      {/* Video track */}
      <div
        className="relative bg-muted rounded cursor-pointer w-full h-[60px]"
        onClick={handleClick}
      >
        {videoClips.map((clip) => {
          if (!isVideoClip(clip)) return null;

          const shot = shots[clip.shotId];
          if (!shot) return null;

          const thumbnailUrl = shot.shotType === 'cinematic'
            ? generatedImages[shot.id]?.imageUrl
            : generatedVideos[shot.id]?.videoUrl;
          const hasThumbnail = !!thumbnailUrl;
          const isSelected = selectedClipId === shot.id;

          const leftPercent = (clip.startTime / totalDuration) * 100;
          const widthPercent = (clip.duration / totalDuration) * 100;

          return (
            <div
              key={clip.id}
              className={`absolute top-0 bottom-0 border-r border-background overflow-hidden cursor-pointer ${isSelected ? 'ring-2 ring-green-500 z-20' : 'z-10'}`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Pass the shot ID (not clip ID) for editor compatibility
                onSelectClip?.(shot.id);
                // Seek to shot's start time to show it in preview
                onSeek?.(clip.startTime);
              }}
            >
              {/* Thumbnail background */}
              {hasThumbnail ? (
                shot.shotType === 'cinematic' ? (
                  <img
                    src={thumbnailUrl}
                    alt={`Shot ${shot.order}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={thumbnailUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    playsInline
                  />
                )
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: shot.shotType === 'cinematic'
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    opacity: 0.5,
                  }}
                />
              )}

              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-black/40" />

              {/* Text content */}
              <div className="relative p-2 text-xs text-white font-medium truncate">
                Shot {shot.order}: {shot.title}
                {!hasThumbnail && ' (not generated)'}
              </div>
              <div className="relative absolute bottom-1 right-1 text-xs text-white/90 font-mono">
                {clip.duration.toFixed(1)}s
              </div>
            </div>
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
          style={{ left: `${Math.min((currentTime / totalDuration) * 100, 100)}%` }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Narration track */}
      {narrationClips.length > 0 && (
        <div
          ref={timelineRef}
          className="relative bg-muted/50 rounded w-full h-[40px]"
          onMouseMove={handleClipDrag}
          onMouseUp={handleClipDragEnd}
          onMouseLeave={handleClipDragEnd}
        >
          <div className="absolute inset-0 flex items-center px-2">
            <span className="text-xs text-muted-foreground font-medium">Narration</span>
          </div>
          {narrationClips.map((clip) => {
            const leftPercent = (clip.startTime / totalDuration) * 100;
            const widthPercent = (clip.duration / totalDuration) * 100;
            const isSelected = selectedClipId === clip.sourceId;
            const isDragging = draggingClipId === clip.id;

            return (
              <div
                key={clip.id}
                className={`absolute top-1 bottom-1 bg-purple-500/70 border-purple-600 rounded border ${isDragging ? 'cursor-grabbing opacity-80' : 'cursor-grab'} ${isSelected ? 'ring-2 ring-green-500 z-20' : 'z-10'}`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                }}
                title={clip.text}
                onMouseDown={(e) => handleClipDragStart(e, clip)}
                onClick={(e) => {
                  if (!isDragging) {
                    e.stopPropagation();
                    onSelectClip?.(clip.sourceId);
                  }
                }}
              >
                <div className="px-1 text-xs text-white/90 truncate pointer-events-none">
                  {clip.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Music track */}
      {musicClips.length > 0 && (
        <div
          className="relative bg-muted/50 rounded w-full h-[40px]"
          onMouseMove={handleClipDrag}
          onMouseUp={handleClipDragEnd}
          onMouseLeave={handleClipDragEnd}
        >
          <div className="absolute inset-0 flex items-center px-2">
            <span className="text-xs text-muted-foreground font-medium">Music</span>
          </div>
          {musicClips.map((clip) => {
            const leftPercent = (clip.startTime / totalDuration) * 100;
            const widthPercent = (clip.duration / totalDuration) * 100;
            const isSelected = selectedClipId === clip.sourceId;
            const isDragging = draggingClipId === clip.id;

            return (
              <div
                key={clip.id}
                className={`absolute top-1 bottom-1 bg-blue-500/70 border-blue-600 rounded border ${isDragging ? 'cursor-grabbing opacity-80' : 'cursor-grab'} ${isSelected ? 'ring-2 ring-green-500 z-20' : 'z-10'}`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                }}
                title="Background Music"
                onMouseDown={(e) => handleClipDragStart(e, clip)}
                onClick={(e) => {
                  if (!isDragging) {
                    e.stopPropagation();
                    onSelectClip?.(clip.sourceId);
                  }
                }}
              >
                <div className="px-1 text-xs text-white/90 truncate pointer-events-none">
                  Background Music
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Total duration */}
      <div className="text-xs text-muted-foreground text-right font-mono w-full">
        Total: {totalDuration.toFixed(1)}s
      </div>
    </div>
  );
}
