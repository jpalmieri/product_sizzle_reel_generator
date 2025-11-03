"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StoryboardResponse } from "@/types/storyboard";
import type { StillImageResponse } from "@/types/still-image";
import type { VideoAnalysisResponse, UploadedVideo } from "@/types/video-analysis";
import type { VideoGenerationResponse } from "@/types/video-generation";
import type { NarrationGenerationResponse } from "@/types/narration";
import type { MusicGenerationResponse, MusicDuckingSettings } from "@/types/music";
import type { Timeline as TimelineType } from "@/types/timeline";
import { TimelineV2 } from "@/components/timeline/TimelineV2";
import { PreviewPlayerV2 } from "@/components/timeline/PreviewPlayerV2";
import { BlockEditorPanel } from "@/components/editors/BlockEditorPanel";
import { UploadSection } from "@/components/upload/UploadSection";
import { storyboardToTimeline, updateNarrationDuration, updateClipPosition, calculateStoryboardDuration, addMusicToTimeline } from "@/lib/timelineConverter";
import { useErrorToast } from "@/hooks/use-error-toast";
import { generateStoryboard } from "@/services/storyboardService";
import { analyzeVideo, extractClip } from "@/services/videoService";
import { generateStillImage, generateVideo } from "@/services/mediaService";
import { generateNarration, generateMusic } from "@/services/audioService";
import { stitchVideoClips, assembleNarrationTrack, duckMusicTrack, assembleFinalVideo } from "@/services/exportService";

export default function Home() {
  const { showError } = useErrorToast();
  const [productDescription, setProductDescription] = useState("");
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [videoFiles, setVideoFiles] = useState<UploadedVideo[]>([]);
  const [videoAnalyses, setVideoAnalyses] = useState<Record<string, VideoAnalysisResponse>>({});
  const [analyzingVideos, setAnalyzingVideos] = useState(false);
  const [currentAnalyzingVideo, setCurrentAnalyzingVideo] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [compressingVideos, setCompressingVideos] = useState<Record<string, boolean>>({});
  const [uploadingVideosCount, setUploadingVideosCount] = useState(0);
  const [totalVideosToUpload, setTotalVideosToUpload] = useState(0);
  const [previewingVideo, setPreviewingVideo] = useState<UploadedVideo | null>(null);
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineType | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Record<string, StillImageResponse>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, VideoGenerationResponse>>({});
  const [generatingVideos, setGeneratingVideos] = useState<Record<string, boolean>>({});
  const [extractingClips, setExtractingClips] = useState<Record<string, boolean>>({});
  const [veoModel, setVeoModel] = useState<'veo-2' | 'veo-3'>('veo-3');
  const [generatedNarration, setGeneratedNarration] = useState<Record<string, NarrationGenerationResponse>>({});
  const [generatingNarration, setGeneratingNarration] = useState<Record<string, boolean>>({});
  const [generatedMusic, setGeneratedMusic] = useState<MusicGenerationResponse | null>(null);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [musicDuckingSettings, setMusicDuckingSettings] = useState<MusicDuckingSettings>({
    enabled: true,
    normalVolume: 0.3,
    duckedVolume: 0.15,
    fadeDuration: 0.2,
  });
  const [previewTime, setPreviewTime] = useState(0);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isInputSectionCollapsed, setIsInputSectionCollapsed] = useState(false);
  const [exportingVideo, setExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>("");
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  // Create shots lookup for timeline components
  const shotsLookup = storyboard?.shots.reduce((acc, shot) => {
    acc[shot.id] = shot;
    return acc;
  }, {} as Record<string, typeof storyboard.shots[0]>) || {};

  // Check if all cinematic shots have generated videos
  const allCinematicVideosGenerated = storyboard?.shots
    .filter(shot => shot.shotType === 'cinematic')
    .every(shot => generatedVideos[shot.id]) ?? false;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError("Please select a valid image file");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBaseImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Set total count for progress tracking
    setTotalVideosToUpload(files.length);
    setUploadingVideosCount(0);

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('video/')) {
        showError(`${file.name} is not a valid video file`);
        continue;
      }

      // Generate unique ID for this video
      const videoId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Increment uploading count
      setUploadingVideosCount(prev => prev + 1);

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;

        // Check if compression is needed (over 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        let compressedData = result;

        if (file.size > maxSize) {
          // Compress for analysis
          setCompressingVideos(prev => ({ ...prev, [videoId]: true }));
          try {
            const response = await fetch("/api/video/compress", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                videoData: result,
                targetSizeMB: 9, // Stay under 10MB limit
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to compress video");
            }

            const compressionResult = await response.json();
            compressedData = compressionResult.compressedVideo;

            console.log(`${file.name} compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressionResult.compressedSize / 1024 / 1024).toFixed(2)}MB (${(compressionResult.compressionRatio * 100).toFixed(0)}%)`);
          } catch (err) {
            showError(`Failed to compress ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
            setCompressingVideos(prev => {
              const updated = { ...prev };
              delete updated[videoId];
              return updated;
            });
            // Decrement uploading count on failure
            setUploadingVideosCount(prev => Math.max(0, prev - 1));
            return;
          } finally {
            setCompressingVideos(prev => {
              const updated = { ...prev };
              delete updated[videoId];
              return updated;
            });
          }
        }

        // Add video to array
        const uploadedVideo: UploadedVideo = {
          id: videoId,
          filename: file.name,
          originalData: result,
          compressedData,
          mimeType: file.type,
        };

        setVideoFiles(prev => [...prev, uploadedVideo]);

        // Decrement uploading count when done
        setUploadingVideosCount(prev => Math.max(0, prev - 1));
      };
      reader.readAsDataURL(file);
    }

    // Clear the input so the same file can be uploaded again if deleted
    event.target.value = '';
  };

  const handleDeleteVideo = (videoId: string) => {
    // If storyboard exists, show warning dialog
    if (storyboard) {
      setVideoToDelete(videoId);
      setDeleteWarningOpen(true);
      return;
    }

    // Otherwise delete immediately
    confirmDeleteVideo(videoId);
  };

  const confirmDeleteVideo = (videoId: string) => {
    setVideoFiles(prev => prev.filter(v => v.id !== videoId));
    setVideoAnalyses(prev => {
      const updated = { ...prev };
      delete updated[videoId];
      return updated;
    });

    // Clear storyboard if it references the deleted video
    if (storyboard) {
      const hasDeletedVideoReference = storyboard.shots.some(
        shot => shot.shotType === 'ui' && shot.videoId === videoId
      );

      if (hasDeletedVideoReference) {
        setStoryboard(null);
        setTimeline(null);
        setGeneratedImages({});
        setGeneratedVideos({});
        setGeneratedNarration({});
        setGeneratedMusic(null);
      }
    }

    // Close dialog
    setDeleteWarningOpen(false);
    setVideoToDelete(null);
  };

  const handleGenerateStoryboard = async () => {
    if (!productDescription.trim()) {
      showError("Please enter a product description");
      return;
    }

    if (!baseImage) {
      showError("Please upload a base image");
      return;
    }

    if (videoFiles.length === 0) {
      showError("Please upload at least one UI screen recording");
      return;
    }

    // Clear all previous generated content before starting regeneration
    setStoryboard(null);
    setTimeline(null);
    setGeneratedImages({});
    setGeneratedVideos({});
    setGeneratedNarration({});
    setGeneratedMusic(null);

    setLoading(true);

    try {
      // Auto-analyze all videos that haven't been analyzed yet
      const analysisResults: VideoAnalysisResponse[] = [];

      // Calculate how many videos need analysis
      const videosToAnalyze = videoFiles.filter(v => !videoAnalyses[v.id]);
      const totalToAnalyze = videosToAnalyze.length;
      let currentIndex = 0;

      if (totalToAnalyze > 0) {
        setAnalyzingVideos(true);
      }

      for (const video of videoFiles) {
        // Check if we already have analysis for this video
        if (videoAnalyses[video.id]) {
          analysisResults.push(videoAnalyses[video.id]);
          continue;
        }

        // Update progress
        currentIndex++;
        setCurrentAnalyzingVideo({
          current: currentIndex,
          total: totalToAnalyze,
          filename: video.filename
        });

        // Analyze this video
        try {
          const analysis = await analyzeVideo(
            video.compressedData,
            video.mimeType,
            video.id
          );
          analysisResults.push(analysis);

          // Store analysis
          setVideoAnalyses(prev => ({ ...prev, [video.id]: analysis }));
        } catch (err) {
          throw new Error(`Video analysis failed for ${video.filename}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      setAnalyzingVideos(false);
      setCurrentAnalyzingVideo(null);

      const result = await generateStoryboard(
        productDescription,
        analysisResults
      );
      setStoryboard(result);

      // Convert storyboard to timeline
      const newTimeline = storyboardToTimeline(result);
      setTimeline(newTimeline);

      // Collapse input section after successful generation
      setIsInputSectionCollapsed(true);

      // Automatically extract UI clips
      const uiShots = result.shots.filter(shot => shot.shotType === 'ui');
      for (const shot of uiShots) {
        if (shot.shotType === 'ui') {
          handleExtractClip(shot.id, shot.videoId, shot.startTime, shot.endTime);
        }
      }

      // Auto-generate stills for cinematic shots (baseImage should exist due to earlier validation)
      if (baseImage) {
        for (const shot of result.shots) {
          if (shot.shotType === 'cinematic') {
            handleGenerateStill(shot.id, shot.stillPrompt);
          }
        }
      }

      // Auto-generate narration for all segments
      if (result.narration && result.narration.length > 0) {
        for (const segment of result.narration) {
          handleGenerateNarration(segment.id, segment.text);
        }
      }

      // Auto-generate background music if prompt is available
      if (result.musicPrompt) {
        // Delay music generation to ensure timeline is set up first
        setTimeout(() => {
          const customDurationMs = null; // Will auto-calculate from storyboard
          handleGenerateMusic(result.musicPrompt, customDurationMs, result);
        }, 1000);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setAnalyzingVideos(false);
      setCurrentAnalyzingVideo(null);
    }
  };

  const handleGenerateStill = async (shotId: string, prompt: string) => {
    if (!baseImage) {
      showError("Please upload a base image before generating stills");
      return;
    }

    // Update storyboard with edited prompt to persist it
    if (storyboard) {
      setStoryboard({
        ...storyboard,
        shots: storyboard.shots.map(shot =>
          shot.id === shotId ? { ...shot, stillPrompt: prompt } : shot
        ),
      });
    }

    setGeneratingImages(prev => ({ ...prev, [shotId]: true }));

    const previousShots: string[] = [];

    try {
      const result = await generateStillImage(
        shotId,
        prompt,
        baseImage,
        previousShots
      );
      setGeneratedImages(prev => ({ ...prev, [shotId]: result }));

      // Clear any existing video for this shot since the still has changed
      setGeneratedVideos(prev => {
        const updated = { ...prev };
        delete updated[shotId];
        return updated;
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setGeneratingImages(prev => ({ ...prev, [shotId]: false }));
    }
  };

  const handleGenerateVideo = async (shotId: string, prompt: string) => {
    const imageData = generatedImages[shotId];
    if (!imageData?.imageUrl) {
      showError("Please generate a still image first before creating a video");
      return;
    }

    // Update storyboard with edited prompt to persist it
    if (storyboard) {
      setStoryboard({
        ...storyboard,
        shots: storyboard.shots.map(shot =>
          shot.id === shotId ? { ...shot, videoPrompt: prompt } : shot
        ),
      });
    }

    setGeneratingVideos(prev => ({ ...prev, [shotId]: true }));

    try {
      const result = await generateVideo(
        shotId,
        imageData.imageUrl,
        prompt,
        veoModel
      );
      setGeneratedVideos(prev => ({ ...prev, [shotId]: result }));
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate video");
    } finally {
      setGeneratingVideos(prev => ({ ...prev, [shotId]: false }));
    }
  };

  const handleExtractClip = async (shotId: string, videoId: string, startTime: number, endTime: number) => {
    // Find the video by ID
    const video = videoFiles.find(v => v.id === videoId);
    if (!video) {
      showError(`Video not found for shot ${shotId}`);
      return;
    }

    setExtractingClips(prev => ({ ...prev, [shotId]: true }));

    try {
      const result = await extractClip(
        shotId,
        video.originalData, // Use original data for extraction
        startTime,
        endTime
      );
      // Store extracted clip in generatedVideos like cinematic videos
      setGeneratedVideos(prev => ({
        ...prev,
        [shotId]: {
          shotId: result.shotId,
          videoUrl: result.videoUrl,
          prompt: '',
          processingTimeMs: result.processingTimeMs,
          timestamp: result.timestamp
        }
      }));
    } catch (err) {
      console.error('Extraction error:', err);
      showError(err instanceof Error ? err.message : "Failed to extract clip");
    } finally {
      setExtractingClips(prev => ({ ...prev, [shotId]: false }));
    }
  };

  const handleGenerateNarration = async (narrationId: string, text: string) => {
    // Update storyboard with edited text to persist it
    if (storyboard && storyboard.narration) {
      setStoryboard({
        ...storyboard,
        narration: storyboard.narration.map(segment =>
          segment.id === narrationId ? { ...segment, text } : segment
        ),
      });
    }

    setGeneratingNarration(prev => ({ ...prev, [narrationId]: true }));

    try {
      const result = await generateNarration(narrationId, text);
      setGeneratedNarration(prev => ({ ...prev, [narrationId]: result }));

      // Load audio to get actual duration and update timeline
      const audio = new Audio(result.audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        const actualDuration = audio.duration;

        // Update timeline with actual audio duration
        setTimeline(prevTimeline => {
          if (!prevTimeline) return prevTimeline;
          return updateNarrationDuration(prevTimeline, narrationId, actualDuration);
        });
      });
      audio.load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate narration");
    } finally {
      setGeneratingNarration(prev => ({ ...prev, [narrationId]: false }));
    }
  };

  const handleGenerateMusic = async (customPrompt?: string, customDurationMs?: number | null, storyboardData?: StoryboardResponse) => {
    // Use provided values or fall back to state
    const prompt = customPrompt || storyboard?.musicPrompt;
    const sb = storyboardData || storyboard;

    if (!prompt || !sb) return;

    setGeneratingMusic(true);

    try {
      // Use custom duration if provided, otherwise calculate from storyboard
      const durationMs = customDurationMs !== undefined && customDurationMs !== null
        ? customDurationMs
        : Math.round(calculateStoryboardDuration(sb) * 1000);

      const result = await generateMusic(prompt, durationMs);
      setGeneratedMusic(result);

      // Load audio to get actual duration and add to timeline
      const audio = new Audio(result.audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        const actualDuration = audio.duration;

        // Update the music response with actual duration
        setGeneratedMusic(prev => prev ? {
          ...prev,
          actualDurationSeconds: actualDuration
        } : null);

        // Add music to timeline
        setTimeline(prevTimeline => {
          if (!prevTimeline) return prevTimeline;
          return addMusicToTimeline(prevTimeline, actualDuration);
        });
      });
      audio.load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate music");
    } finally {
      setGeneratingMusic(false);
    }
  };

  const handleExportSizzleReel = async () => {
    if (!timeline || !storyboard || !generatedMusic) {
      showError("Timeline, storyboard, and music are required for export");
      return;
    }

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

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <CardTitle>Project Input</CardTitle>
                  {!isInputSectionCollapsed && (
                    <CardDescription>Upload assets and define your sizzle reel</CardDescription>
                  )}
                </div>
              </div>
              {storyboard && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsInputSectionCollapsed(!isInputSectionCollapsed)}
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${isInputSectionCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className={`space-y-6 ${isInputSectionCollapsed ? 'hidden' : ''}`}>
            <UploadSection
              baseImage={baseImage}
              onImageUpload={handleImageUpload}
              videoFiles={videoFiles}
              compressingVideos={compressingVideos}
              uploadingVideosCount={uploadingVideosCount}
              totalVideosToUpload={totalVideosToUpload}
              onVideoUpload={handleVideoUpload}
              onPreviewVideo={setPreviewingVideo}
              onDeleteVideo={handleDeleteVideo}
              disabled={loading}
            />

            {/* Product Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Description *</label>
              <Textarea
                placeholder="Revolutionary NeuralChain™ platform leveraging hyperscale synergy nodes to disrupt the global productivity paradigm. Features include AI-powered thoughtstreaming, Web7 integration, quantum-entangled collaboration holograms, and blockchain-verified mindfulness metrics."
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className={`resize-none transition-all duration-300 ${
                  loading ? 'h-10' : (storyboard && !isInputSectionCollapsed ? 'h-60' : 'h-24')
                }`}
                disabled={loading}
              />
              {loading && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {currentAnalyzingVideo
                        ? `Analyzing video ${currentAnalyzingVideo.current} of ${currentAnalyzingVideo.total}: ${currentAnalyzingVideo.filename}`
                        : analyzingVideos
                        ? 'Preparing video analysis...'
                        : 'Generating storyboard...'}
                    </p>
                  </div>
                  {currentAnalyzingVideo && (
                    <div className="mt-2 h-1.5 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-500"
                        style={{ width: `${(currentAnalyzingVideo.current / currentAnalyzingVideo.total) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateStoryboard}
              disabled={
                loading ||
                !productDescription.trim() ||
                !baseImage ||
                videoFiles.length === 0 ||
                uploadingVideosCount > 0 ||
                Object.keys(compressingVideos).length > 0
              }
              size="lg"
              className={`w-full text-white ${
                loading
                  ? 'bg-gradient-to-r from-blue-500 via-purple-600 via-blue-500 to-purple-600 bg-[length:200%_100%] animate-[gradient_2s_ease-in-out_infinite]'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              }`}
              style={loading ? {
                backgroundPosition: 'left center',
                animation: 'gradient 2s ease-in-out infinite',
              } : undefined}
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {loading ? "Generating..." : "Generate Storyboard"}
            </Button>
            <style jsx>{`
              @keyframes gradient {
                0%, 100% {
                  background-position: 0% 50%;
                }
                50% {
                  background-position: 100% 50%;
                }
              }
            `}</style>
          </CardContent>
          {isInputSectionCollapsed && storyboard && (
            <CardContent className="!block">
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex-1">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Product:</span>{' '}
                      {productDescription.slice(0, 100)}
                      {productDescription.length > 100 && '...'}
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateStoryboard}
                    disabled={loading}
                    size="sm"
                    variant="outline"
                  >
                    Regenerate
                  </Button>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {baseImage && <span>✓ Character image uploaded</span>}
                  {videoFiles.length > 0 && <span>✓ {videoFiles.length} video{videoFiles.length > 1 ? 's' : ''} uploaded</span>}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Old storyboard card removed - now using focus-mode editing below timeline */}

        {storyboard && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {Object.keys(generatedVideos).length > 0 || Object.keys(generatedImages).length > 0
                  ? "Watch your sizzle reel come together. Click timeline blocks to edit individual shots or narration."
                  : "Click timeline blocks to edit individual shots or narration"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {timeline && (Object.keys(generatedVideos).length > 0 || Object.keys(generatedImages).length > 0) && (
                <PreviewPlayerV2
                  timeline={timeline}
                  shots={shotsLookup}
                  generatedVideos={generatedVideos}
                  generatedImages={generatedImages}
                  generatedNarration={generatedNarration}
                  generatedMusic={generatedMusic}
                  musicDuckingSettings={musicDuckingSettings}
                  onTimeUpdate={setPreviewTime}
                  seekTime={seekTime}
                />
              )}

              {timeline && (
                <div className="flex justify-center">
                  <TimelineV2
                    timeline={timeline}
                    shots={shotsLookup}
                    currentTime={previewTime}
                    onSeek={(time) => {
                      setSeekTime(time);
                      setTimeout(() => setSeekTime(undefined), 100);
                    }}
                    generatedVideos={generatedVideos}
                    generatedImages={generatedImages}
                    generatedNarration={generatedNarration}
                    generatedMusic={generatedMusic}
                    selectedClipId={selectedBlockId}
                    onSelectClip={setSelectedBlockId}
                    onClipPositionChange={(clipId, newStartTime) => {
                      setTimeline(prevTimeline => {
                        if (!prevTimeline) return prevTimeline;
                        return updateClipPosition(prevTimeline, clipId, newStartTime);
                      });
                    }}
                  />
                </div>
              )}

              {/* Export Section */}
              {timeline && Object.keys(generatedVideos).length > 0 && (
                <div className="flex flex-col items-center gap-4 pt-6 border-t">
                  <Button
                    onClick={handleExportSizzleReel}
                    disabled={exportingVideo || !allCinematicVideosGenerated}
                    size="lg"
                    className="min-w-[200px]"
                  >
                    {exportingVideo ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {exportProgress || "Exporting..."}
                      </>
                    ) : (
                      "Export Sizzle Reel"
                    )}
                  </Button>

                  {!allCinematicVideosGenerated && !exportingVideo && (
                    <p className="text-sm text-muted-foreground">
                      Generate all cinematic videos to enable export
                    </p>
                  )}

                  {exportedVideoUrl && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-green-600 font-medium">Sizzle reel complete!</p>
                      <Button
                        onClick={handleDownloadVideo}
                        variant="outline"
                        size="sm"
                      >
                        Download Video
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <BlockEditorPanel
                selectedBlockId={selectedBlockId}
                storyboard={storyboard}
                generatedImages={generatedImages}
                generatingImages={generatingImages}
                generatedVideos={generatedVideos}
                generatingVideos={generatingVideos}
                extractingClips={extractingClips}
                generatedNarration={generatedNarration}
                generatingNarration={generatingNarration}
                generatedMusic={generatedMusic}
                generatingMusic={generatingMusic}
                musicDuckingSettings={musicDuckingSettings}
                videoFiles={videoFiles}
                baseImage={baseImage}
                veoModel={veoModel}
                onGenerateStill={handleGenerateStill}
                onGenerateVideo={handleGenerateVideo}
                onExtractClip={handleExtractClip}
                onGenerateNarration={handleGenerateNarration}
                onGenerateMusic={handleGenerateMusic}
                onMusicDuckingSettingsChange={setMusicDuckingSettings}
                onVeoModelChange={setVeoModel}
              />
            </CardContent>
          </Card>
        )}

        {/* Video Preview Dialog */}
        <Dialog open={!!previewingVideo} onOpenChange={(open) => !open && setPreviewingVideo(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewingVideo?.filename}</DialogTitle>
            </DialogHeader>
            {previewingVideo && (
              <div className="space-y-3">
                <video
                  key={previewingVideo.id}
                  src={previewingVideo.compressedData}
                  controls
                  controlsList="nodownload"
                  autoPlay
                  className="w-full h-auto rounded-lg bg-black"
                  style={{ maxHeight: '70vh' }}
                >
                  Your browser does not support the video tag.
                </video>
                <p className="text-xs text-muted-foreground">
                  Preview of compressed video used for analysis
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Video Warning Dialog */}
        <Dialog open={deleteWarningOpen} onOpenChange={setDeleteWarningOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Warning: Delete UI Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Deleting a UI video after generating a storyboard may cause issues with the timeline and video clips.
              </p>
              <p className="text-sm font-medium">
                Recommended: Refresh the page and re-upload all assets to start fresh.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteWarningOpen(false);
                    setVideoToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => videoToDelete && confirmDeleteVideo(videoToDelete)}
                >
                  Delete Anyway
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

