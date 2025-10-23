"use client";

import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EditablePromptButtonProps {
  initialPrompt: string;
  promptLabel: string;
  buttonContent: ReactNode;
  onGenerate: (prompt: string, duration?: number) => void;
  disabled?: boolean;
  variant: "default" | "outline";
  rightContent?: ReactNode;
  showDuration?: boolean;
  initialDuration?: number;
}

export function EditablePromptButton({
  initialPrompt,
  promptLabel,
  buttonContent,
  onGenerate,
  disabled,
  variant,
  rightContent,
}: EditablePromptButtonProps) {
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [promptEditing, setPromptEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(initialPrompt);
  const [promptModified, setPromptModified] = useState(false);

  // Sync local state when initialPrompt changes (e.g., switching shots)
  useEffect(() => {
    setEditedPrompt(initialPrompt);
    setPromptModified(false);
    setPromptExpanded(false);
    setPromptEditing(false);
  }, [initialPrompt]);

  return (
    <>
      <div className="flex items-start gap-2">
        <button
          onClick={() => setPromptExpanded(!promptExpanded)}
          className="mt-1.5 text-muted-foreground hover:text-foreground transition-transform"
          title={`View/edit ${promptLabel.toLowerCase()}`}
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
            onClick={() => {
              onGenerate(editedPrompt);
              setPromptModified(false);
            }}
            disabled={disabled}
            size="sm"
            variant={promptModified ? "default" : variant}
          >
            {buttonContent}
          </Button>
          {rightContent}
        </div>
      </div>
      {promptExpanded && (
        <div className="ml-6 bg-muted p-3 rounded-md relative">
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
          <p className="text-xs text-muted-foreground mb-2">{promptLabel}:</p>
          {promptEditing ? (
            <textarea
              value={editedPrompt}
              onChange={(e) => {
                setEditedPrompt(e.target.value);
                setPromptModified(e.target.value !== initialPrompt);
              }}
              className="w-full text-sm bg-background border border-input rounded-md p-2 min-h-[100px]"
            />
          ) : (
            <p className="text-sm pr-12">{editedPrompt}</p>
          )}
        </div>
      )}
    </>
  );
}
