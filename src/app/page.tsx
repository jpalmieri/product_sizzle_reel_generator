"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { StoryboardResponse } from "@/types/storyboard";

export default function Home() {
  const [productDescription, setProductDescription] = useState("");
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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
                  <div key={shot.id} className="border-l-2 border-primary pl-4 space-y-2">
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
