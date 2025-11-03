import type { UploadedVideo } from "@/types/video-analysis";
import { VideoList } from "./VideoList";
import { UploadProgressIndicator } from "./UploadProgressIndicator";

interface VideoUploadZoneProps {
  videoFiles: UploadedVideo[];
  compressingVideos: Record<string, boolean>;
  uploadingVideosCount: number;
  totalVideosToUpload: number;
  onVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPreviewVideo: (video: UploadedVideo) => void;
  onDeleteVideo: (videoId: string) => void;
  disabled?: boolean;
}

export function VideoUploadZone({
  videoFiles,
  compressingVideos,
  uploadingVideosCount,
  totalVideosToUpload,
  onVideoUpload,
  onPreviewVideo,
  onDeleteVideo,
  disabled = false,
}: VideoUploadZoneProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">UI Screen Recordings *</label>

      {/* List of uploaded videos */}
      <VideoList
        videoFiles={videoFiles}
        compressingVideos={compressingVideos}
        onPreviewVideo={onPreviewVideo}
        onDeleteVideo={onDeleteVideo}
        disabled={disabled}
      />

      {/* Upload progress indicator */}
      <UploadProgressIndicator
        current={uploadingVideosCount}
        total={totalVideosToUpload}
      />

      {/* Upload drop zone */}
      <div className="relative">
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={onVideoUpload}
          disabled={disabled}
          className={`absolute inset-0 w-full h-full opacity-0 z-10 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        />
        <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          videoFiles.length > 0
            ? 'border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/50'
            : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600'
        }`}>
          <svg className="mx-auto h-12 w-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm font-medium">
            {videoFiles.length > 0 ? 'Drop more videos here or click' : 'Drop screen recordings here'}
          </p>
          <p className="text-xs text-muted-foreground">MP4, MOV (auto-compressed if large)</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Best results with videos under 60 seconds
      </p>
    </div>
  );
}
