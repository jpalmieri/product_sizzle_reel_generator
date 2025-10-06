"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { StoryboardResponse } from "@/types/storyboard";
import type { StillImageResponse } from "@/types/still-image";
import type { VideoAnalysisResponse } from "@/types/video-analysis";
import type { VideoGenerationResponse } from "@/types/video-generation";
import type { NarrationGenerationResponse } from "@/types/narration";
import type { Timeline as TimelineType } from "@/types/timeline";
import { TimelineV2 } from "@/components/timeline/TimelineV2";
import { PreviewPlayerV2 } from "@/components/timeline/PreviewPlayerV2";
import { BlockEditorPanel } from "@/components/editors/BlockEditorPanel";
import { storyboardToTimeline, updateNarrationDuration, updateClipPosition } from "@/lib/timelineConverter";

export default function Home() {
  const [productDescription, setProductDescription] = useState("");
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [videoMimeType, setVideoMimeType] = useState<string | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysisResponse | null>(null);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, StillImageResponse>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, VideoGenerationResponse>>({});
  const [generatingVideos, setGeneratingVideos] = useState<Record<string, boolean>>({});
  const [extractingClips, setExtractingClips] = useState<Record<string, boolean>>({});
  const [veoModel, setVeoModel] = useState<'veo-2' | 'veo-3'>('veo-3');
  const [generatedNarration, setGeneratedNarration] = useState<Record<string, NarrationGenerationResponse>>({});
  const [generatingNarration, setGeneratingNarration] = useState<Record<string, boolean>>({});
  const [previewTime, setPreviewTime] = useState(0);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Create shots lookup for timeline components
  const shotsLookup = storyboard?.shots.reduce((acc, shot) => {
    acc[shot.id] = shot;
    return acc;
  }, {} as Record<string, typeof storyboard.shots[0]>) || {};

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
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
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError(`Video file too large. Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB. Please trim or compress your video.`);
      return;
    }

    setError(null);
    setVideoAnalysis(null); // Clear previous analysis

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setVideoFile(result);
      setVideoMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile || !videoMimeType) {
      setError("Please upload a video first");
      return;
    }

    setAnalyzingVideo(true);
    setError(null);

    try {
      const response = await fetch("/api/video/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video: videoFile,
          mimeType: videoMimeType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze video");
      }

      const result: VideoAnalysisResponse = await response.json();
      setVideoAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze video");
    } finally {
      setAnalyzingVideo(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!productDescription.trim()) {
      setError("Please enter a product description");
      return;
    }

    if (!baseImage) {
      setError("Please upload a base image");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Auto-analyze video first if available and not already analyzed
      let analysisResult = videoAnalysis;
      if (videoFile && !videoAnalysis) {
        setAnalyzingVideo(true);
        try {
          const response = await fetch("/api/video/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              video: videoFile,
              mimeType: videoMimeType,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to analyze video");
          }

          analysisResult = await response.json();
          setVideoAnalysis(analysisResult);
        } catch (err) {
          throw new Error(`Video analysis failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
          setAnalyzingVideo(false);
        }
      }

      const requestBody: { productDescription: string; videoAnalysis?: VideoAnalysisResponse } = {
        productDescription: productDescription.trim(),
      };

      // Include video analysis if available
      if (analysisResult) {
        requestBody.videoAnalysis = {
          overallDescription: analysisResult.overallDescription,
          duration: analysisResult.duration,
          segments: analysisResult.segments,
        };
      }

      const response = await fetch("/api/storyboard/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate storyboard");
      }

      const result: StoryboardResponse = await response.json();
      setStoryboard(result);

      // Convert storyboard to timeline
      const newTimeline = storyboardToTimeline(result);
      setTimeline(newTimeline);

      setGeneratedImages({}); // Clear previous images when new storyboard is generated
      setGeneratedVideos({}); // Clear previous videos when new storyboard is generated
      setGeneratedNarration({}); // Clear previous narration when new storyboard is generated

      // Automatically extract UI clips if video is available
      if (videoFile) {
        const uiShots = result.shots.filter(shot => shot.shotType === 'ui');
        for (const shot of uiShots) {
          handleExtractClip(shot.id, shot.startTime, shot.endTime);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStill = async (shotId: string, prompt: string) => {
    if (!baseImage) {
      setError("Please upload a base image before generating stills");
      return;
    }

    setGeneratingImages(prev => ({ ...prev, [shotId]: true }));

    const previousShots: string[] = [];

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shotId,
          prompt,
          baseImage,
          previousShots,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate image");
      }

      const result: StillImageResponse = await response.json();
      setGeneratedImages(prev => ({ ...prev, [shotId]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setGeneratingImages(prev => ({ ...prev, [shotId]: false }));
    }
  };

  const handleGenerateVideo = async (shotId: string, prompt: string) => {
    const imageData = generatedImages[shotId];
    if (!imageData?.imageUrl) {
      setError("Please generate a still image first before creating a video");
      return;
    }

    setGeneratingVideos(prev => ({ ...prev, [shotId]: true }));
    setError(null);

    try {
      const response = await fetch("/api/videos/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shotId,
          imageUrl: imageData.imageUrl,
          prompt,
          model: veoModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate video");
      }

      const result: VideoGenerationResponse = await response.json();
      setGeneratedVideos(prev => ({ ...prev, [shotId]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video");
    } finally {
      setGeneratingVideos(prev => ({ ...prev, [shotId]: false }));
    }
  };

  const handleExtractClip = async (shotId: string, startTime: number, endTime: number) => {
    if (!videoFile) {
      setError("No video file uploaded");
      return;
    }

    setExtractingClips(prev => ({ ...prev, [shotId]: true }));
    setError(null);

    try {
      const response = await fetch("/api/video/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shotId,
          videoData: videoFile,
          startTime,
          endTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract clip");
      }

      const result = await response.json();
      // Store extracted clip in generatedVideos like cinematic videos
      setGeneratedVideos(prev => ({ ...prev, [shotId]: { videoUrl: result.videoUrl } as any }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract clip");
    } finally {
      setExtractingClips(prev => ({ ...prev, [shotId]: false }));
    }
  };

  const handleGenerateNarration = async (narrationId: string, text: string) => {
    setGeneratingNarration(prev => ({ ...prev, [narrationId]: true }));
    setError(null);

    try {
      const response = await fetch("/api/narration/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          narrationId,
          text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate narration");
      }

      const result: NarrationGenerationResponse = await response.json();
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
      setError(err instanceof Error ? err.message : "Failed to generate narration");
    } finally {
      setGeneratingNarration(prev => ({ ...prev, [narrationId]: false }));
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">AI Sizzle Reel Generator</h1>
          <p className="text-xl text-muted-foreground">
            Transform your product descriptions into cinematic storyboards
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate Storyboard</CardTitle>
            <CardDescription>
              Describe your product and we&apos;ll create a cinematic storyboard for your sizzle reel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Description</label>
              <Textarea
                placeholder="Describe your product or app feature in detail. What does it do? What makes it special? What problem does it solve?"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Character Image (Required)</label>
              <p className="text-xs text-muted-foreground">
                Upload a reference image of your character - this ensures visual consistency across all generated stills
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {baseImage && (
                <div className="border rounded-lg p-2 bg-muted">
                  <img
                    src={baseImage}
                    alt="Character reference image"
                    className="max-w-32 h-auto rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Character image uploaded</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">UI Screen Recording (Optional)</label>
              <p className="text-xs text-muted-foreground">
                Upload a screen recording of your app feature. The AI will analyze it and intelligently mix UI clips with cinematic shots. Max 10MB, recommended under 60 seconds.
              </p>
              <Input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
              />
              {videoFile && (
                <div className="space-y-2">
                  {!videoAnalysis ? (
                    <div className="border rounded-lg p-3 bg-muted">
                      <p className="text-sm font-medium">Video uploaded</p>
                      <p className="text-xs text-muted-foreground">Will be analyzed when you generate storyboard</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">✓ Video analyzed</p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Duration: {videoAnalysis.duration.toFixed(1)}s • {videoAnalysis.segments.length} segments identified
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{videoAnalysis.overallDescription}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <Button
              onClick={handleGenerateStoryboard}
              disabled={loading || !productDescription.trim()}
            >
              {loading ? "Generating..." : "Generate Storyboard"}
            </Button>
          </CardContent>
        </Card>

        {/* Old storyboard card removed - now using focus-mode editing below timeline */}

        {storyboard && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {Object.keys(generatedVideos).length > 0
                  ? "Watch your sizzle reel come together. Click timeline blocks to edit individual shots or narration."
                  : "Click timeline blocks to edit individual shots or narration"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {timeline && Object.keys(generatedVideos).length > 0 && (
                <PreviewPlayerV2
                  timeline={timeline}
                  shots={shotsLookup}
                  generatedVideos={generatedVideos}
                  generatedNarration={generatedNarration}
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
                videoFile={videoFile}
                baseImage={baseImage}
                veoModel={veoModel}
                onGenerateStill={handleGenerateStill}
                onGenerateVideo={handleGenerateVideo}
                onGenerateNarration={handleGenerateNarration}
                onVeoModelChange={setVeoModel}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

