"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function Header() {
  const [open, setOpen] = useState(true);

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 pointer-events-none" />
      <div className="container relative flex h-16 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
            Sizzle Reel Generator
          </h1>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="rounded-full h-12 w-12 text-2xl font-semibold hover:bg-accent">
              ?
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">How to Create a Sizzle Reel</DialogTitle>
              <DialogDescription>
                Follow these steps to generate a cinematic product video
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 text-sm">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold">
                    1
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold">Upload Character Image</h3>
                    <p className="text-muted-foreground">
                      Upload a photo of the person who will appear in your sizzle reel. The photo's aspect ratio may influence the composition of cinematic shots.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 font-semibold">
                    2
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold">Upload UI Screen Recording</h3>
                    <p className="text-muted-foreground">
                      Upload a screen recording of your app or product in action. Best results with videos under 60 seconds. The AI will analyze this to extract relevant UI clips.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 font-semibold">
                    3
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold">Enter Product Description</h3>
                    <p className="text-muted-foreground">
                      Describe the specific feature or functionality you want to showcase. Focus on what makes it valuable and how users interact with it.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 font-semibold">
                    4
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold">Generate Storyboard</h3>
                    <p className="text-muted-foreground">
                      Click "Generate Storyboard" and the AI will automatically create still images for cinematic shots, extract UI clips, generate narration, and add background music.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400 font-semibold">
                    5
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold">Preview & Generate Videos</h3>
                    <p className="text-muted-foreground">
                      Review the still images for each cinematic shot. If you're happy with a still, click the shot block in the timeline to generate the video. You can regenerate stills before creating videos if needed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400 font-semibold">
                    6
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold">Edit & Refine</h3>
                    <p className="text-muted-foreground">
                      Click any timeline block to edit shots or narration. Regenerate videos with custom prompts, reposition narration blocks, and adjust music ducking settings.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold">
                    7
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold">Export Final Video</h3>
                    <p className="text-muted-foreground">
                      Once all cinematic videos are generated, the "Export Sizzle Reel" button will be enabled. Click it to assemble everything into a final MP4 video ready for download.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Tips for Best Results
                </h3>
                <ul className="space-y-1 text-muted-foreground text-sm list-disc list-inside">
                  <li>Use clear, well-lit character photos for better AI generation</li>
                  <li>Keep UI recordings focused on key interactions</li>
                  <li>Be specific in product descriptions about the feature's value</li>
                  <li>Preview your work frequently using the timeline player</li>
                </ul>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-900 dark:text-blue-100">
                <p className="flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>You can access this help menu anytime by clicking the <strong>?</strong> button in the top right corner.</span>
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
