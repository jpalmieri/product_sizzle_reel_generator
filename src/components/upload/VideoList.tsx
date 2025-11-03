import type { UploadedVideo } from "@/types/video-analysis";

interface VideoListProps {
  videoFiles: UploadedVideo[];
  compressingVideos: Record<string, boolean>;
  onPreviewVideo: (video: UploadedVideo) => void;
  onDeleteVideo: (videoId: string) => void;
  disabled?: boolean;
}

export function VideoList({
  videoFiles,
  compressingVideos,
  onPreviewVideo,
  onDeleteVideo,
  disabled = false,
}: VideoListProps) {
  if (videoFiles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-3">
      {videoFiles.map(video => (
        <div
          key={video.id}
          className="flex items-center gap-3 p-3 border rounded-lg bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
          onClick={() => onPreviewVideo(video)}
        >
          <svg className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100 truncate">
              {video.filename}
            </p>
            {compressingVideos[video.id] && (
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Compressing...
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteVideo(video.id);
            }}
            disabled={disabled}
            className="shrink-0 p-1 hover:bg-purple-200 dark:hover:bg-purple-900 rounded transition-colors disabled:opacity-50"
            aria-label="Delete video"
          >
            <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
