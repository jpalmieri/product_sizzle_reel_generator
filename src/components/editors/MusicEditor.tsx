"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { MusicGenerationResponse, MusicDuckingSettings } from "@/types/music";

interface MusicEditorProps {
  musicPrompt: string;
  generatedMusic: MusicGenerationResponse | null;
  generatingMusic: boolean;
  requestedDurationMs: number;
  duckingSettings: MusicDuckingSettings;
  onGenerateMusic: (prompt: string, durationMs: number) => void;
  onDuckingSettingsChange: (settings: MusicDuckingSettings) => void;
}

export function MusicEditor({
  musicPrompt,
  generatedMusic,
  generatingMusic,
  requestedDurationMs,
  duckingSettings,
  onGenerateMusic,
  onDuckingSettingsChange,
}: MusicEditorProps) {
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [promptEditing, setPromptEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(musicPrompt);
  const [editedDuration, setEditedDuration] = useState((requestedDurationMs / 1000).toFixed(1));
  const [promptModified, setPromptModified] = useState(false);

  const handleGenerate = () => {
    const durationMs = Math.round(parseFloat(editedDuration) * 1000);
    onGenerateMusic(editedPrompt, durationMs);
    setPromptModified(false);
  };

  return (
    <div className="border-l-4 border-blue-500 pl-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm font-medium">
          Background Music
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        AI-generated instrumental music for your sizzle reel
      </p>

      {/* Editable Music Prompt and Duration */}
      <div className="flex items-start gap-2">
        <button
          onClick={() => setPromptExpanded(!promptExpanded)}
          className="mt-1.5 text-muted-foreground hover:text-foreground transition-transform"
          title="View/edit music prompt and duration"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${promptExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="flex-1 flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={generatingMusic}
            size="sm"
            variant={promptModified ? "default" : generatedMusic ? "outline" : "default"}
          >
            {generatingMusic ? "Generating..." : generatedMusic ? "Regenerate Music" : "Generate Music"}
          </Button>
        </div>
      </div>

      {promptExpanded && (
        <div className="ml-6 bg-muted p-3 rounded-md relative space-y-3">
          <div className="absolute top-2 right-2 flex gap-2">
            {promptEditing ? (
              <button
                onClick={() => {
                  setPromptEditing(false);
                  setPromptExpanded(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Done
              </button>
            ) : (
              <button
                onClick={() => setPromptEditing(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Edit
              </button>
            )}
          </div>

          {/* Duration Field */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Duration (seconds):</p>
            {promptEditing ? (
              <Input
                type="number"
                step="0.1"
                value={editedDuration}
                onChange={(e) => {
                  setEditedDuration(e.target.value);
                  setPromptModified(true);
                }}
                className="w-32 text-sm bg-background"
              />
            ) : (
              <p className="text-sm">{editedDuration}s</p>
            )}
          </div>

          {/* Music Prompt */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Music Prompt:</p>
            {promptEditing ? (
              <textarea
                value={editedPrompt}
                onChange={(e) => {
                  setEditedPrompt(e.target.value);
                  setPromptModified(e.target.value !== musicPrompt);
                }}
                className="w-full text-sm bg-background border border-input rounded-md p-2 min-h-[100px]"
              />
            ) : (
              <p className="text-sm pr-12">{editedPrompt}</p>
            )}
          </div>
        </div>
      )}

      {/* Generated Music Player */}
      {generatedMusic && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Generated Music</label>
          <audio
            src={generatedMusic.audioUrl}
            controls
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Generated in {(generatedMusic.processingTimeMs / 1000).toFixed(1)}s
            {generatedMusic.actualDurationSeconds && ` • Duration: ${generatedMusic.actualDurationSeconds.toFixed(1)}s`}
          </p>
        </div>
      )}

      {/* Audio Ducking Settings */}
      {generatedMusic && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Audio Ducking</label>
              <p className="text-xs text-muted-foreground">
                Lower music volume during narration
              </p>
            </div>
            <Switch
              checked={duckingSettings.enabled}
              onCheckedChange={(enabled) =>
                onDuckingSettingsChange({ ...duckingSettings, enabled })
              }
            />
          </div>

          {duckingSettings.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              {/* Normal Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">
                    Normal Volume
                  </label>
                  <span className="text-sm font-mono">
                    {Math.round(duckingSettings.normalVolume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[duckingSettings.normalVolume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={([normalVolume]) =>
                    onDuckingSettingsChange({ ...duckingSettings, normalVolume })
                  }
                />
              </div>

              {/* Ducked Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">
                    Ducked Volume
                  </label>
                  <span className="text-sm font-mono">
                    {Math.round(duckingSettings.duckedVolume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[duckingSettings.duckedVolume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={([duckedVolume]) =>
                    onDuckingSettingsChange({ ...duckingSettings, duckedVolume })
                  }
                />
              </div>

              {/* Fade Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">
                    Fade Duration
                  </label>
                  <span className="text-sm font-mono">
                    {duckingSettings.fadeDuration.toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[duckingSettings.fadeDuration]}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  onValueChange={([fadeDuration]) =>
                    onDuckingSettingsChange({ ...duckingSettings, fadeDuration })
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      {generatingMusic && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <span>Generating background music...</span>
        </div>
      )}
    </div>
  );
}
