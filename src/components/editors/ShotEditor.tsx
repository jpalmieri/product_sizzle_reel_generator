"use client";

import { Button } from "@/components/ui/button";
import type { StoryboardShot } from "@/types/storyboard";
import type { StillImageResponse } from "@/types/still-image";
import type { VideoGenerationResponse } from "@/types/video-generation";

interface ShotEditorProps {
  shot: StoryboardShot;
  generatedImage?: StillImageResponse;
  generatingImage?: boolean;
  generatedVideo?: VideoGenerationResponse;
  generatingVideo?: boolean;
  extractingClip?: boolean;
  videoFile?: string | null;
  baseImage?: string | null;
  veoModel: 'veo-2' | 'veo-3';
  onGenerateStill: (shotId: string, prompt: string) => void;
  onGenerateVideo: (shotId: string, prompt: string) => void;
  onVeoModelChange: (model: 'veo-2' | 'veo-3') => void;
}

export function ShotEditor({
  shot,
  generatedImage,
  generatingImage,
  generatedVideo,
  generatingVideo,
  extractingClip,
  videoFile,
  baseImage,
  veoModel,
  onGenerateStill,
  onGenerateVideo,
  onVeoModelChange,
}: ShotEditorProps) {
  return (
    <div className="border-l-4 border-primary pl-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-medium">
          Shot {shot.order}
        </span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          shot.shotType === 'cinematic'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        }`}>
          {shot.shotType === 'cinematic' ? '🎬 Cinematic' : '📱 UI'}
        </span>
        <h3 className="font-semibold">{shot.title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{shot.description}</p>

      {shot.shotType === 'cinematic' ? (
        <div className="space-y-3">
          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Still Prompt:</p>
            <p className="text-sm">{shot.stillPrompt}</p>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Video Prompt:</p>
            <p className="text-sm">{shot.videoPrompt}</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Button
                onClick={() => onGenerateStill(shot.id, shot.stillPrompt)}
                disabled={generatingImage || !baseImage}
                size="sm"
              >
                {generatingImage ? "Generating..." : "Generate Still"}
              </Button>
            </div>

            {generatedImage && (
              <div className="space-y-3">
                <div className="border rounded-lg p-4 bg-background">
                  <img
                    src={generatedImage.imageUrl}
                    alt={`Still for ${shot.title}`}
                    className="w-full h-auto rounded-md"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Generated in {generatedImage.processingTimeMs}ms
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => onGenerateVideo(shot.id, shot.videoPrompt)}
                      disabled={generatingVideo}
                      size="sm"
                      variant="outline"
                    >
                      {generatingVideo ? "Generating Video..." : "Generate Video"}
                    </Button>
                    <select
                      value={veoModel}
                      onChange={(e) => onVeoModelChange(e.target.value as 'veo-2' | 'veo-3')}
                      disabled={generatingVideo}
                      className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="veo-2">Veo 2</option>
                      <option value="veo-3">Veo 3</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {generatingVideo
                      ? "⏱️ This may take several minutes..."
                      : "🎬 Convert still to video clip with motion"}
                  </p>
                </div>

                {generatedVideo && (
                  <div className="border rounded-lg p-4 bg-background">
                    <video
                      src={generatedVideo.videoUrl}
                      controls
                      className="w-full h-auto rounded-md"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                    <p className="text-xs text-muted-foreground mt-2">
                      Video generated in {(generatedVideo.processingTimeMs / 1000).toFixed(1)}s
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">UI Screen Recording Clip:</p>
            <p className="text-sm font-medium">{shot.uiDescription}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Timestamp: {shot.startTime.toFixed(1)}s - {shot.endTime.toFixed(1)}s
              ({(shot.endTime - shot.startTime).toFixed(1)}s duration)
            </p>
          </div>

          {videoFile && (
            <div className="border rounded-lg p-4 bg-background max-w-md">
              {generatedVideo ? (
                <>
                  <video
                    src={generatedVideo.videoUrl}
                    controls
                    className="w-full h-auto rounded-md"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Extracted clip ready
                  </p>
                </>
              ) : extractingClip ? (
                <div className="aspect-video flex items-center justify-center bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Extracting clip...</p>
                </div>
              ) : (
                <>
                  <video
                    src={`${videoFile}#t=${shot.startTime},${shot.endTime}`}
                    controls
                    className="w-full h-auto rounded-md"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-xs text-muted-foreground mt-2">
                    Preview: {shot.startTime.toFixed(1)}s - {shot.endTime.toFixed(1)}s
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
