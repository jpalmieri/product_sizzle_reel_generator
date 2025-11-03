import { useState } from "react";
import type { Timeline } from "@/types/timeline";
import type { StoryboardResponse } from "@/types/storyboard";
import type { StillImageResponse } from "@/types/still-image";
import type { VideoGenerationResponse } from "@/types/video-generation";
import type { NarrationGenerationResponse } from "@/types/narration";
import type { MusicGenerationResponse, MusicDuckingSettings } from "@/types/music";
import { stitchVideoClips, assembleNarrationTrack, duckMusicTrack, assembleFinalVideo } from "@/services/exportService";
import { useErrorToast } from "@/hooks/use-error-toast";

interface UseExportSizzleReelParams {
  timeline: Timeline | null;
  storyboard: StoryboardResponse | null;
  generatedMusic: MusicGenerationResponse | null;
  generatedNarration: Record<string, NarrationGenerationResponse>;
  generatedVideos: Record<string, VideoGenerationResponse>;
  generatedImages: Record<string, StillImageResponse>;
  musicDuckingSettings: MusicDuckingSettings;
}

export function useExportSizzleReel({
  timeline,
  storyboard,
  generatedMusic,
  generatedNarration,
  generatedVideos,
  generatedImages,
  musicDuckingSettings,
}: UseExportSizzleReelParams) {
  const { showError } = useErrorToast();

  const [exportingVideo, setExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>("");
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  const handleExportSizzleReel = async () => {
    if (!timeline || !storyboard || !generatedMusic) {
      showError("Timeline, storyboard, and music are required for export");
      return;
    }

    // Create shots lookup
    const shotsLookup = storyboard.shots.reduce((acc, shot) => {
      acc[shot.id] = shot;
      return acc;
    }, {} as Record<string, typeof storyboard.shots[0]>);

    setExportingVideo(true);
    setExportedVideoUrl(null);
    setExportProgress("");

    try {
      // Step 1: Stitch video clips
      setExportProgress("Stitching video clips...");
      const videoResult = await stitchVideoClips(
        timeline,
        shotsLookup,
        generatedVideos,
        generatedImages
      );

      // Step 2: Assemble narration track
      setExportProgress("Assembling narration track...");
      const narrationResult = await assembleNarrationTrack(
        timeline,
        generatedNarration,
        timeline.totalDuration
      );

      // Step 3: Duck music track
      setExportProgress("Ducking music track...");
      const musicResult = await duckMusicTrack(
        generatedMusic.audioUrl,
        timeline,
        musicDuckingSettings,
        timeline.totalDuration
      );

      // Step 4: Final assembly - mix audio + video
      setExportProgress("Mixing audio and video...");
      const finalResult = await assembleFinalVideo(
        videoResult.videoUrl,
        narrationResult.audioUrl,
        musicResult.audioUrl
      );
      setExportedVideoUrl(finalResult.videoUrl);
      setExportProgress("Complete!");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to export sizzle reel");
      setExportProgress("");
    } finally {
      setExportingVideo(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!exportedVideoUrl) return;

    // Create download link
    const link = document.createElement('a');
    link.href = exportedVideoUrl;
    link.download = `sizzle-reel-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    exportingVideo,
    exportProgress,
    exportedVideoUrl,
    handleExportSizzleReel,
    handleDownloadVideo,
  };
}
