"use client"

import { useToast } from "./use-toast"

export function useErrorToast() {
  const { toast } = useToast()

  const showError = (message: string) => {
    toast({
      variant: "destructive",
      title: "Error",
      description: message,
    })
  }

  return { showError }
}
