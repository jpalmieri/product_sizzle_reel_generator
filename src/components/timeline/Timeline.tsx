"use client";

import { StoryboardShot, NarrationSegment } from "@/types/storyboard";
import { useTimeline } from "@/hooks/useTimeline";

interface TimelineProps {
  shots: StoryboardShot[];
  narration?: NarrationSegment[];
  currentTime?: number;
  onSeek?: (time: number) => void;
  generatedVideos?: Record<string, any>;
  generatedImages?: Record<string, any>;
}

export function Timeline({ shots, narration, currentTime = 0, onSeek, generatedVideos = {}, generatedImages = {} }: TimelineProps) {
  const { items: shotPositions, totalDuration } = useTimeline(shots);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const time = (x / width) * totalDuration;
    onSeek(Math.max(0, Math.min(time, totalDuration)));
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

      {/* Shot blocks */}
      <div
        className="relative bg-muted rounded cursor-pointer w-full h-[60px]"
        onClick={handleClick}
      >
        {shotPositions.map(({ shot, startTime, duration }) => {
          // For cinematic shots: use still image; for UI shots: use video
          const thumbnailUrl = shot.shotType === 'cinematic'
            ? generatedImages[shot.id]?.imageUrl
            : generatedVideos[shot.id]?.videoUrl;
          const hasThumbnail = !!thumbnailUrl;

          const leftPercent = (startTime / totalDuration) * 100;
          const widthPercent = (duration / totalDuration) * 100;

          return (
            <div
              key={shot.id}
              className="absolute top-0 bottom-0 border-r border-background overflow-hidden"
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
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
                {duration.toFixed(1)}s
              </div>
            </div>
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
          style={{ left: `${Math.min((currentTime / totalDuration) * 100, 100)}%` }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Narration segments */}
      {narration && narration.length > 0 && (
        <div className="relative bg-muted/50 rounded w-full h-[40px]">
          <div className="absolute inset-0 flex items-center px-2">
            <span className="text-xs text-muted-foreground font-medium">Narration</span>
          </div>
          {narration.map((segment) => {
            const leftPercent = (segment.startTime / totalDuration) * 100;
            const widthPercent = ((segment.endTime - segment.startTime) / totalDuration) * 100;

            return (
              <div
                key={segment.id}
                className="absolute top-1 bottom-1 bg-purple-500/70 rounded border border-purple-600"
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                }}
                title={segment.text}
              >
                <div className="px-1 text-xs text-white/90 truncate">
                  {segment.text}
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
