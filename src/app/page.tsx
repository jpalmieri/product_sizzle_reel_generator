"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { StoryboardResponse } from "@/types/storyboard";
import type { StillImageResponse } from "@/types/still-image";

export default function Home() {
  const [productDescription, setProductDescription] = useState("");
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, StillImageResponse>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});

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

  const handleGenerateStoryboard = async () => {
    if (!productDescription.trim()) {
      setError("Please enter a product description");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/storyboard/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productDescription: productDescription.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate storyboard");
      }

      const result: StoryboardResponse = await response.json();
      setStoryboard(result);
      setGeneratedImages({}); // Clear previous images when new storyboard is generated
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStill = async (shotId: string, prompt: string) => {
    setGeneratingImages(prev => ({ ...prev, [shotId]: true }));

    // Get previously generated shots for this storyboard (shots with order < current shot order)
    const currentShot = storyboard?.shots.find(shot => shot.id === shotId);
    const previousShots: string[] = [];

    if (currentShot && storyboard) {
      // Get all shots with lower order that have been generated
      const previousShotIds = storyboard.shots
        .filter(shot => shot.order < currentShot.order)
        .sort((a, b) => a.order - b.order)
        .map(shot => shot.id);

      // Collect the image URLs of previously generated shots
      previousShotIds.forEach(id => {
        if (generatedImages[id]?.imageUrl) {
          previousShots.push(generatedImages[id].imageUrl);
        }
      });
    }

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
              Describe your product and we'll create a cinematic storyboard for your sizzle reel
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
              <label className="text-sm font-medium">Base Image (Optional)</label>
              <p className="text-xs text-muted-foreground">
                Upload a reference image for character/product consistency across all generated stills
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
                    alt="Base reference image"
                    className="max-w-32 h-auto rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Reference image uploaded</p>
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
              <div className="space-y-6">
                {storyboard.shots.map((shot) => (
                  <div key={shot.id} className="border-l-2 border-primary pl-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-medium">
                        Shot {shot.order}
                      </span>
                      <h3 className="font-semibold">{shot.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{shot.description}</p>

                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Still Prompt:</p>
                      <p className="text-sm">{shot.stillPrompt}</p>
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        const previousShotCount = storyboard.shots
                          .filter(s => s.order < shot.order)
                          .filter(s => generatedImages[s.id]?.imageUrl).length;
                        const hasPreviousShots = previousShotCount > 0;

                        return (
                          <div className="space-y-2">
                            <Button
                              onClick={() => handleGenerateStill(shot.id, shot.stillPrompt)}
                              disabled={generatingImages[shot.id]}
                              size="sm"
                            >
                              {generatingImages[shot.id] ? "Generating..." : "Generate Still"}
                            </Button>
                            {hasPreviousShots && (
                              <p className="text-xs text-muted-foreground">
                                ✨ Will use {baseImage ? "base image + " : ""}{previousShotCount} previous shot{previousShotCount > 1 ? 's' : ''} for visual continuity
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {generatedImages[shot.id] && (
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
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
