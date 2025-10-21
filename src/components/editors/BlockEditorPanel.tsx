"use client";

import { ShotEditor } from "./ShotEditor";
import { NarrationEditor } from "./NarrationEditor";
import { MusicEditor } from "./MusicEditor";
import type { StoryboardResponse } from "@/types/storyboard";
import type { StillImageResponse } from "@/types/still-image";
import type { VideoGenerationResponse } from "@/types/video-generation";
import type { NarrationGenerationResponse } from "@/types/narration";
import type { MusicGenerationResponse } from "@/types/music";

interface BlockEditorPanelProps {
  selectedBlockId: string | null;
  storyboard: StoryboardResponse;
  generatedImages: Record<string, StillImageResponse>;
  generatingImages: Record<string, boolean>;
  generatedVideos: Record<string, VideoGenerationResponse>;
  generatingVideos: Record<string, boolean>;
  extractingClips: Record<string, boolean>;
  generatedNarration: Record<string, NarrationGenerationResponse>;
  generatingNarration: Record<string, boolean>;
  generatedMusic: MusicGenerationResponse | null;
  generatingMusic: boolean;
  videoFile: string | null;
  baseImage: string | null;
  veoModel: 'veo-2' | 'veo-3';
  onGenerateStill: (shotId: string, prompt: string) => void;
  onGenerateVideo: (shotId: string, prompt: string) => void;
  onExtractClip: (shotId: string, startTime: number, endTime: number) => void;
  onGenerateNarration: (narrationId: string, text: string) => void;
  onGenerateMusic: (prompt: string) => void;
  onVeoModelChange: (model: 'veo-2' | 'veo-3') => void;
}

export function BlockEditorPanel({
  selectedBlockId,
  storyboard,
  generatedImages,
  generatingImages,
  generatedVideos,
  generatingVideos,
  extractingClips,
  generatedNarration,
  generatingNarration,
  generatedMusic,
  generatingMusic,
  videoFile,
  baseImage,
  veoModel,
  onGenerateStill,
  onGenerateVideo,
  onExtractClip,
  onGenerateNarration,
  onGenerateMusic,
  onVeoModelChange,
}: BlockEditorPanelProps) {
  if (!selectedBlockId) {
    return null;
  }

  // Check if it's a shot
  const selectedShot = storyboard.shots.find(s => s.id === selectedBlockId);
  if (selectedShot) {
    return (
      <div className="mt-6">
        <ShotEditor
          shot={selectedShot}
          generatedImage={generatedImages[selectedShot.id]}
          generatingImage={generatingImages[selectedShot.id]}
          generatedVideo={generatedVideos[selectedShot.id]}
          generatingVideo={generatingVideos[selectedShot.id]}
          extractingClip={extractingClips[selectedShot.id]}
          videoFile={videoFile}
          baseImage={baseImage}
          veoModel={veoModel}
          onGenerateStill={onGenerateStill}
          onGenerateVideo={onGenerateVideo}
          onExtractClip={onExtractClip}
          onVeoModelChange={onVeoModelChange}
        />
      </div>
    );
  }

  // Check if it's a narration segment
  const selectedNarration = storyboard.narration?.find(n => n.id === selectedBlockId);
  if (selectedNarration) {
    return (
      <div className="mt-6">
        <NarrationEditor
          segment={selectedNarration}
          generatedNarration={generatedNarration[selectedNarration.id]}
          generatingNarration={generatingNarration[selectedNarration.id]}
          onGenerateNarration={onGenerateNarration}
        />
      </div>
    );
  }

  // Check if it's the background music
  if (selectedBlockId === 'background-music' && storyboard.musicPrompt) {
    return (
      <div className="mt-6">
        <MusicEditor
          musicPrompt={storyboard.musicPrompt}
          generatedMusic={generatedMusic}
          generatingMusic={generatingMusic}
          requestedDurationMs={generatedMusic?.requestedDurationMs || 0}
          onGenerateMusic={onGenerateMusic}
        />
      </div>
    );
  }

  return null;
}
