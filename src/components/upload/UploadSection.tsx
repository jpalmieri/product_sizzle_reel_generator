import type { UploadedVideo } from "@/types/video-analysis";
import { ImageUploadZone } from "./ImageUploadZone";
import { VideoUploadZone } from "./VideoUploadZone";

interface UploadSectionProps {
  baseImage: string | null;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  videoFiles: UploadedVideo[];
  compressingVideos: Record<string, boolean>;
  uploadingVideosCount: number;
  totalVideosToUpload: number;
  onVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPreviewVideo: (video: UploadedVideo) => void;
  onDeleteVideo: (videoId: string) => void;
  disabled?: boolean;
}

export function UploadSection({
  baseImage,
  onImageUpload,
  videoFiles,
  compressingVideos,
  uploadingVideosCount,
  totalVideosToUpload,
  onVideoUpload,
  onPreviewVideo,
  onDeleteVideo,
  disabled = false,
}: UploadSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ImageUploadZone
        baseImage={baseImage}
        onImageUpload={onImageUpload}
        disabled={disabled}
      />
      <VideoUploadZone
        videoFiles={videoFiles}
        compressingVideos={compressingVideos}
        uploadingVideosCount={uploadingVideosCount}
        totalVideosToUpload={totalVideosToUpload}
        onVideoUpload={onVideoUpload}
        onPreviewVideo={onPreviewVideo}
        onDeleteVideo={onDeleteVideo}
        disabled={disabled}
      />
    </div>
  );
}
