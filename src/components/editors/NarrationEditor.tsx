"use client";

import { Button } from "@/components/ui/button";
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
      <p className="text-sm italic">&quot;{segment.text}&quot;</p>
      <div className="flex items-center gap-3">
        <Button
          onClick={() => onGenerateNarration(segment.id, segment.text)}
          disabled={generatingNarration}
          size="sm"
          variant="outline"
        >
          {generatingNarration ? "Generating..." : "Generate Audio"}
        </Button>
        {generatedNarration && (
          <audio
            src={generatedNarration.audioUrl}
            controls
            className="h-8"
          />
        )}
      </div>
      {generatedNarration && (
        <p className="text-xs text-muted-foreground">
          Generated in {generatedNarration.processingTimeMs}ms
        </p>
      )}
    </div>
  );
}
