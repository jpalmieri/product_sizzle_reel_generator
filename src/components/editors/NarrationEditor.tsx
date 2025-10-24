"use client";

import { EditablePromptButton } from "./EditablePromptButton";
import type { NarrationSegment } from "@/types/storyboard";
import type { NarrationGenerationResponse } from "@/types/narration";

interface NarrationEditorProps {
  segment: NarrationSegment;
  generatedNarration?: NarrationGenerationResponse;
  generatingNarration?: boolean;
  onGenerateNarration: (narrationId: string, text: string) => void;
}

export function NarrationEditor({
  segment,
  generatedNarration,
  generatingNarration,
  onGenerateNarration,
}: NarrationEditorProps) {
  return (
    <div className="border-l-4 border-purple-500 pl-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-mono">{segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s</span>
      </div>

      <EditablePromptButton
        initialPrompt={segment.text}
        promptLabel="Narration Text"
        buttonContent={generatingNarration ? "Generating..." : generatedNarration ? "Regenerate Audio" : "Generate Audio"}
        onGenerate={(text) => onGenerateNarration(segment.id, text)}
        disabled={generatingNarration}
        variant={generatedNarration ? "outline" : "default"}
        rightContent={
          generatedNarration && (
            <audio
              src={generatedNarration.audioUrl}
              controls
              className="h-8"
            />
          )
        }
      />

      {generatedNarration && (
        <p className="text-xs text-muted-foreground ml-6">
          Generated in {generatedNarration.processingTimeMs}ms
        </p>
      )}
    </div>
  );
}
