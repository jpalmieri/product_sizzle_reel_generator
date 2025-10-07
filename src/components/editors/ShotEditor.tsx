"use client";

import { useState } from "react";
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
  onExtractClip: (shotId: string, startTime: number, endTime: number) => void;
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
  onExtractClip,
  onVeoModelChange,
}: ShotEditorProps) {
  const [stillPromptExpanded, setStillPromptExpanded] = useState(false);
  const [videoPromptExpanded, setVideoPromptExpanded] = useState(false);
  const [stillPromptEditing, setStillPromptEditing] = useState(false);
  const [videoPromptEditing, setVideoPromptEditing] = useState(false);
  const [editedStillPrompt, setEditedStillPrompt] = useState(shot.stillPrompt);
  const [editedVideoPrompt, setEditedVideoPrompt] = useState(shot.videoPrompt);
  const [stillPromptModified, setStillPromptModified] = useState(false);
  const [videoPromptModified, setVideoPromptModified] = useState(false);

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
          <div className="space-y-3">
            {/* Buttons: Conditional based on generation state */}
            <div className="space-y-2">
              {!generatedImage && !generatedVideo && (
                // Case 1: Nothing generated
                <>
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setStillPromptExpanded(!stillPromptExpanded)}
                      className="mt-1.5 text-muted-foreground hover:text-foreground transition-transform"
                      title="View/edit still prompt"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${stillPromptExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="flex-1">
                      <Button
                        onClick={() => onGenerateStill(shot.id, editedStillPrompt)}
                        disabled={generatingImage || !baseImage}
                        size="sm"
                        variant="default"
                      >
                        {generatingImage ? "Generating..." : "Generate Still"}
                      </Button>
                    </div>
                  </div>
                  {stillPromptExpanded && (
                    <div className="ml-6 bg-muted p-3 rounded-md relative">
                      <div className="absolute top-2 right-2 flex gap-2">
                        {stillPromptEditing ? (
                          <button
                            onClick={() => {
                              setStillPromptEditing(false);
                              setStillPromptExpanded(false);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Done
                          </button>
                        ) : (
                          <button
                            onClick={() => setStillPromptEditing(true)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">Still Prompt:</p>
                      {stillPromptEditing ? (
                        <textarea
                          value={editedStillPrompt}
                          onChange={(e) => {
                            setEditedStillPrompt(e.target.value);
                            setStillPromptModified(e.target.value !== shot.stillPrompt);
                          }}
                          className="w-full text-sm bg-background border border-input rounded-md p-2 min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm pr-12">{editedStillPrompt}</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {generatedImage && !generatedVideo && (
                // Case 2: Still generated, no video
                <>
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setStillPromptExpanded(!stillPromptExpanded)}
                      className="mt-1.5 text-muted-foreground hover:text-foreground transition-transform"
                      title="View/edit still prompt"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${stillPromptExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="flex-1">
                      <Button
                        onClick={() => {
                          onGenerateStill(shot.id, editedStillPrompt);
                          setStillPromptModified(false);
                        }}
                        disabled={generatingImage || !baseImage}
                        size="sm"
                        variant={stillPromptModified ? "default" : "outline"}
                      >
                        {stillPromptModified ? "Generate Still" : "Regenerate Still"}
                      </Button>
                    </div>
                  </div>
                  {stillPromptExpanded && (
                    <div className="ml-6 bg-muted p-3 rounded-md relative">
                      <div className="absolute top-2 right-2 flex gap-2">
                        {stillPromptEditing ? (
                          <button
                            onClick={() => {
                              setStillPromptEditing(false);
                              setStillPromptExpanded(false);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Done
                          </button>
                        ) : (
                          <button
                            onClick={() => setStillPromptEditing(true)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">Still Prompt:</p>
                      {stillPromptEditing ? (
                        <textarea
                          value={editedStillPrompt}
                          onChange={(e) => {
                            setEditedStillPrompt(e.target.value);
                            setStillPromptModified(e.target.value !== shot.stillPrompt);
                          }}
                          className="w-full text-sm bg-background border border-input rounded-md p-2 min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm pr-12">{editedStillPrompt}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setVideoPromptExpanded(!videoPromptExpanded)}
                      className="mt-1.5 text-muted-foreground hover:text-foreground transition-transform"
                      title="View/edit video prompt"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${videoPromptExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="flex-1 flex items-center gap-3">
                      <Button
                        onClick={() => {
                          onGenerateVideo(shot.id, editedVideoPrompt);
                          setVideoPromptModified(false);
                        }}
                        disabled={generatingVideo}
                        size="sm"
                        variant="default"
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
                      <p className="text-xs text-muted-foreground">
                        {generatingVideo ? "⏱️ This may take several minutes..." : "🎬 Model selection"}
                      </p>
                    </div>
                  </div>
                  {videoPromptExpanded && (
                    <div className="ml-6 bg-muted p-3 rounded-md relative">
                      <div className="absolute top-2 right-2 flex gap-2">
                        {videoPromptEditing ? (
                          <button
                            onClick={() => {
                              setVideoPromptEditing(false);
                              setVideoPromptExpanded(false);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Done
                          </button>
                        ) : (
                          <button
                            onClick={() => setVideoPromptEditing(true)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">Video Prompt:</p>
                      {videoPromptEditing ? (
                        <textarea
                          value={editedVideoPrompt}
                          onChange={(e) => {
                            setEditedVideoPrompt(e.target.value);
                            setVideoPromptModified(e.target.value !== shot.videoPrompt);
                          }}
                          className="w-full text-sm bg-background border border-input rounded-md p-2 min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm pr-12">{editedVideoPrompt}</p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    If you like the still, press Generate Video to create a video based on it
                  </p>
                </>
              )}

              {generatedImage && generatedVideo && (
                // Case 3: Both generated
                <>
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setStillPromptExpanded(!stillPromptExpanded)}
                      className="mt-1.5 text-muted-foreground hover:text-foreground transition-transform"
                      title="View/edit still prompt"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${stillPromptExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="flex-1">
                      <Button
                        onClick={() => {
                          onGenerateStill(shot.id, editedStillPrompt);
                          setStillPromptModified(false);
                        }}
                        disabled={generatingImage || !baseImage}
                        size="sm"
                        variant={stillPromptModified ? "default" : "outline"}
                      >
                        {stillPromptModified ? "Generate Still" : "Regenerate Still"}
                      </Button>
                    </div>
                  </div>
                  {stillPromptExpanded && (
                    <div className="ml-6 bg-muted p-3 rounded-md relative">
                      <div className="absolute top-2 right-2 flex gap-2">
                        {stillPromptEditing ? (
                          <button
                            onClick={() => {
                              setStillPromptEditing(false);
                              setStillPromptExpanded(false);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Done
                          </button>
                        ) : (
                          <button
                            onClick={() => setStillPromptEditing(true)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">Still Prompt:</p>
                      {stillPromptEditing ? (
                        <textarea
                          value={editedStillPrompt}
                          onChange={(e) => {
                            setEditedStillPrompt(e.target.value);
                            setStillPromptModified(e.target.value !== shot.stillPrompt);
                          }}
                          className="w-full text-sm bg-background border border-input rounded-md p-2 min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm pr-12">{editedStillPrompt}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setVideoPromptExpanded(!videoPromptExpanded)}
                      className="mt-1.5 text-muted-foreground hover:text-foreground transition-transform"
                      title="View/edit video prompt"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${videoPromptExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="flex-1 flex items-center gap-3">
                      <Button
                        onClick={() => {
                          onGenerateVideo(shot.id, editedVideoPrompt);
                          setVideoPromptModified(false);
                        }}
                        disabled={generatingVideo}
                        size="sm"
                        variant={videoPromptModified ? "default" : "outline"}
                      >
                        {videoPromptModified ? "Generate Video" : "Regenerate Video"}
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
                      <p className="text-xs text-muted-foreground">
                        {generatingVideo ? "⏱️ This may take several minutes..." : "🎬 Model selection"}
                      </p>
                    </div>
                  </div>
                  {videoPromptExpanded && (
                    <div className="ml-6 bg-muted p-3 rounded-md relative">
                      <div className="absolute top-2 right-2 flex gap-2">
                        {videoPromptEditing ? (
                          <button
                            onClick={() => {
                              setVideoPromptEditing(false);
                              setVideoPromptExpanded(false);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Done
                          </button>
                        ) : (
                          <button
                            onClick={() => setVideoPromptEditing(true)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">Video Prompt:</p>
                      {videoPromptEditing ? (
                        <textarea
                          value={editedVideoPrompt}
                          onChange={(e) => {
                            setEditedVideoPrompt(e.target.value);
                            setVideoPromptModified(e.target.value !== shot.videoPrompt);
                          }}
                          className="w-full text-sm bg-background border border-input rounded-md p-2 min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm pr-12">{editedVideoPrompt}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Display: Show video OR still, not both */}
            {generatedVideo ? (
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
            ) : generatedImage ? (
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
            ) : (
              <div className="border rounded-lg p-4 bg-muted text-center">
                <p className="text-sm text-muted-foreground">
                  No still or video generated yet
                </p>
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
            <div className="border rounded-lg p-4 bg-background max-w-md space-y-3">
              {generatedVideo ? (
                <>
                  <video
                    src={generatedVideo.videoUrl}
                    controls
                    className="w-full h-auto rounded-md"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-xs text-green-600">
                    ✓ Extracted clip ready
                  </p>
                  <Button
                    onClick={() => onExtractClip(shot.id, shot.startTime, shot.endTime)}
                    disabled={extractingClip}
                    variant="outline"
                    size="sm"
                  >
                    Re-extract Clip
                  </Button>
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
                  <p className="text-xs text-muted-foreground">
                    Preview: {shot.startTime.toFixed(1)}s - {shot.endTime.toFixed(1)}s
                  </p>
                  <Button
                    onClick={() => onExtractClip(shot.id, shot.startTime, shot.endTime)}
                    disabled={extractingClip}
                    variant="default"
                    size="sm"
                  >
                    Extract Clip
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
