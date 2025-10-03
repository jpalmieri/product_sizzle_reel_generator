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
import { Timeline } from "@/components/timeline/Timeline";
import { PreviewPlayer } from "@/components/timeline/PreviewPlayer";

export default function Home() {
  const [productDescription, setProductDescription] = useState("");
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [videoMimeType, setVideoMimeType] = useState<string | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysisResponse | null>(null);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);
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
      const requestBody: { productDescription: string; videoAnalysis?: VideoAnalysisResponse } = {
        productDescription: productDescription.trim(),
      };

      // Include video analysis if available
      if (videoAnalysis) {
        requestBody.videoAnalysis = {
          overallDescription: videoAnalysis.overallDescription,
          duration: videoAnalysis.duration,
          segments: videoAnalysis.segments,
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
      setGeneratedImages({}); // Clear previous images when new storyboard is generated
      setGeneratedVideos({}); // Clear previous videos when new storyboard is generated

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
                  <div className="border rounded-lg p-3 bg-muted">
                    <p className="text-sm font-medium">Video uploaded</p>
                    <p className="text-xs text-muted-foreground">Ready to analyze</p>
                  </div>
                  {!videoAnalysis && (
                    <Button
                      onClick={handleAnalyzeVideo}
                      disabled={analyzingVideo}
                      size="sm"
                      variant="outline"
                    >
                      {analyzingVideo ? "Analyzing video..." : "Analyze Video"}
                    </Button>
                  )}
                  {videoAnalysis && (
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

        {storyboard && (
          <Card>
            <CardHeader>
              <CardTitle>{storyboard.title}</CardTitle>
              <CardDescription>{storyboard.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {storyboard.narration && storyboard.narration.length > 0 && (
                <div className="mb-8 p-4 bg-muted rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Voiceover Narration</h3>
                  <div className="space-y-4">
                    {storyboard.narration.map((segment) => (
                      <div key={segment.id} className="border-l-2 border-blue-500 pl-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s</span>
                          </div>
                        </div>
                        <p className="text-sm italic">&quot;{segment.text}&quot;</p>
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={() => handleGenerateNarration(segment.id, segment.text)}
                            disabled={generatingNarration[segment.id]}
                            size="sm"
                            variant="outline"
                          >
                            {generatingNarration[segment.id] ? "Generating..." : "Generate Audio"}
                          </Button>
                          {generatedNarration[segment.id] && (
                            <audio
                              src={generatedNarration[segment.id].audioUrl}
                              controls
                              className="h-8"
                            />
                          )}
                        </div>
                        {generatedNarration[segment.id] && (
                          <p className="text-xs text-muted-foreground">
                            Generated in {generatedNarration[segment.id].processingTimeMs}ms
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {storyboard.shots.map((shot) => (
                  <div key={shot.id} className="border-l-2 border-primary pl-4 space-y-4">
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
                            {generatedVideos[shot.id] ? (
                              <>
                                <video
                                  src={generatedVideos[shot.id].videoUrl}
                                  controls
                                  className="w-full h-auto rounded-md"
                                >
                                  Your browser does not support the video tag.
                                </video>
                                <p className="text-xs text-green-600 mt-2">
                                  ✓ Extracted clip ready
                                </p>
                              </>
                            ) : extractingClips[shot.id] ? (
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

                    {shot.shotType === 'cinematic' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Button
                            onClick={() => handleGenerateStill(shot.id, shot.stillPrompt)}
                            disabled={generatingImages[shot.id] || !baseImage}
                            size="sm"
                          >
                            {generatingImages[shot.id] ? "Generating..." : "Generate Still"}
                          </Button>
                          <div className="space-y-1">
                            <p className="text-xs text-green-600">
                              ✅ Will use base image for character appearance
                            </p>
                            {!baseImage && (
                              <p className="text-xs text-red-600">
                                ⚠️ Base image required before generating stills
                              </p>
                            )}
                          </div>
                        </div>

                        {generatedImages[shot.id] && (
                          <div className="space-y-3">
                            <div className="border rounded-lg p-4 bg-background">
                              <img
                                src={generatedImages[shot.id].imageUrl}
                                alt={`Still for ${shot.title}`}
                                className="w-full h-auto rounded-md"
                              />
                              <p className="text-xs text-muted-foreground mt-2">
                                Generated in {generatedImages[shot.id].processingTimeMs}ms
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <Button
                                  onClick={() => handleGenerateVideo(shot.id, shot.videoPrompt)}
                                  disabled={generatingVideos[shot.id]}
                                  size="sm"
                                  variant="outline"
                                >
                                  {generatingVideos[shot.id] ? "Generating Video..." : "Generate Video"}
                                </Button>
                                <select
                                  value={veoModel}
                                  onChange={(e) => setVeoModel(e.target.value as 'veo-2' | 'veo-3')}
                                  disabled={generatingVideos[shot.id]}
                                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                                >
                                  <option value="veo-2">Veo 2</option>
                                  <option value="veo-3">Veo 3</option>
                                </select>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {generatingVideos[shot.id]
                                  ? "⏱️ This may take several minutes..."
                                  : "🎬 Convert still to video clip with motion"}
                              </p>
                            </div>

                            {generatedVideos[shot.id] && (
                              <div className="border rounded-lg p-4 bg-background">
                                <video
                                  src={generatedVideos[shot.id].videoUrl}
                                  controls
                                  className="w-full h-auto rounded-md"
                                  preload="metadata"
                                >
                                  Your browser does not support the video tag.
                                </video>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Video generated in {(generatedVideos[shot.id].processingTimeMs / 1000).toFixed(1)}s
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {storyboard && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {Object.keys(generatedVideos).length > 0
                  ? "Watch your sizzle reel come together"
                  : "Generate videos to preview your sizzle reel"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(generatedVideos).length > 0 && (
                <PreviewPlayer
                shots={storyboard.shots}
                narration={storyboard.narration}
                generatedVideos={generatedVideos}
                generatedNarration={generatedNarration}
                onTimeUpdate={setPreviewTime}
                seekTime={seekTime}
              />
              )}

              <div className="flex justify-center">
                <Timeline
                  shots={storyboard.shots}
                  narration={storyboard.narration}
                  currentTime={previewTime}
                  onSeek={(time) => {
                    setSeekTime(time);
                    setTimeout(() => setSeekTime(undefined), 100);
                  }}
                  generatedVideos={generatedVideos}
                  generatedImages={generatedImages}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
