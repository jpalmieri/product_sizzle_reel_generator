import { useState } from "react";
import type { VideoAnalysisResponse, UploadedVideo } from "@/types/video-analysis";
import { analyzeVideo } from "@/services/videoService";
import { useErrorToast } from "@/hooks/use-error-toast";

interface UseVideoManagementParams {
  onStoryboardClear?: () => void;
}

export function useVideoManagement({ onStoryboardClear }: UseVideoManagementParams = {}) {
  const { showError } = useErrorToast();

  const [videoFiles, setVideoFiles] = useState<UploadedVideo[]>([]);
  const [videoAnalyses, setVideoAnalyses] = useState<Record<string, VideoAnalysisResponse>>({});
  const [analyzingVideos, setAnalyzingVideos] = useState(false);
  const [currentAnalyzingVideo, setCurrentAnalyzingVideo] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [compressingVideos, setCompressingVideos] = useState<Record<string, boolean>>({});
  const [uploadingVideosCount, setUploadingVideosCount] = useState(0);
  const [totalVideosToUpload, setTotalVideosToUpload] = useState(0);
  const [previewingVideo, setPreviewingVideo] = useState<UploadedVideo | null>(null);
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Set total count for progress tracking
    setTotalVideosToUpload(files.length);
    setUploadingVideosCount(0);

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('video/')) {
        showError(`${file.name} is not a valid video file`);
        continue;
      }

      // Generate unique ID for this video
      const videoId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Increment uploading count
      setUploadingVideosCount(prev => prev + 1);

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;

        // Check if compression is needed (over 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        let compressedData = result;

        if (file.size > maxSize) {
          // Compress for analysis
          setCompressingVideos(prev => ({ ...prev, [videoId]: true }));
          try {
            const response = await fetch("/api/video/compress", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                videoData: result,
                targetSizeMB: 9, // Stay under 10MB limit
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to compress video");
            }

            const compressionResult = await response.json();
            compressedData = compressionResult.compressedVideo;

            console.log(`${file.name} compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressionResult.compressedSize / 1024 / 1024).toFixed(2)}MB (${(compressionResult.compressionRatio * 100).toFixed(0)}%)`);
          } catch (err) {
            showError(`Failed to compress ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
            setCompressingVideos(prev => {
              const updated = { ...prev };
              delete updated[videoId];
              return updated;
            });
            // Decrement uploading count on failure
            setUploadingVideosCount(prev => Math.max(0, prev - 1));
            return;
          } finally {
            setCompressingVideos(prev => {
              const updated = { ...prev };
              delete updated[videoId];
              return updated;
            });
          }
        }

        // Add video to array
        const uploadedVideo: UploadedVideo = {
          id: videoId,
          filename: file.name,
          originalData: result,
          compressedData,
          mimeType: file.type,
        };

        setVideoFiles(prev => [...prev, uploadedVideo]);

        // Decrement uploading count when done
        setUploadingVideosCount(prev => Math.max(0, prev - 1));
      };
      reader.readAsDataURL(file);
    }

    // Clear the input so the same file can be uploaded again if deleted
    event.target.value = '';
  };

  const handleDeleteVideo = (videoId: string, hasStoryboard: boolean) => {
    // If storyboard exists, show warning dialog
    if (hasStoryboard) {
      setVideoToDelete(videoId);
      setDeleteWarningOpen(true);
      return;
    }

    // Otherwise delete immediately
    confirmDeleteVideo(videoId);
  };

  const confirmDeleteVideo = (videoId: string) => {
    setVideoFiles(prev => prev.filter(v => v.id !== videoId));
    setVideoAnalyses(prev => {
      const updated = { ...prev };
      delete updated[videoId];
      return updated;
    });

    // Notify parent to clear storyboard if needed
    if (onStoryboardClear) {
      onStoryboardClear();
    }

    // Close dialog
    setDeleteWarningOpen(false);
    setVideoToDelete(null);
  };

  const analyzeVideosIfNeeded = async (): Promise<VideoAnalysisResponse[]> => {
    const analysisResults: VideoAnalysisResponse[] = [];

    // Calculate how many videos need analysis
    const videosToAnalyze = videoFiles.filter(v => !videoAnalyses[v.id]);
    const totalToAnalyze = videosToAnalyze.length;
    let currentIndex = 0;

    if (totalToAnalyze > 0) {
      setAnalyzingVideos(true);
    }

    for (const video of videoFiles) {
      // Check if we already have analysis for this video
      if (videoAnalyses[video.id]) {
        analysisResults.push(videoAnalyses[video.id]);
        continue;
      }

      // Update progress
      currentIndex++;
      setCurrentAnalyzingVideo({
        current: currentIndex,
        total: totalToAnalyze,
        filename: video.filename
      });

      // Analyze this video
      try {
        const analysis = await analyzeVideo(
          video.compressedData,
          video.mimeType,
          video.id
        );
        analysisResults.push(analysis);

        // Store analysis
        setVideoAnalyses(prev => ({ ...prev, [video.id]: analysis }));
      } catch (err) {
        setAnalyzingVideos(false);
        setCurrentAnalyzingVideo(null);
        throw new Error(`Video analysis failed for ${video.filename}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    setAnalyzingVideos(false);
    setCurrentAnalyzingVideo(null);

    return analysisResults;
  };

  return {
    // State
    videoFiles,
    videoAnalyses,
    analyzingVideos,
    currentAnalyzingVideo,
    compressingVideos,
    uploadingVideosCount,
    totalVideosToUpload,
    previewingVideo,
    deleteWarningOpen,
    videoToDelete,
    setVideoToDelete,

    // Handlers
    handleVideoUpload,
    handleDeleteVideo,
    confirmDeleteVideo,
    setPreviewingVideo,
    setDeleteWarningOpen,

    // Analysis utility
    analyzeVideosIfNeeded,
  };
}
