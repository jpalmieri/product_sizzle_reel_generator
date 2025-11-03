import { Button } from "@/components/ui/button";

interface ExportSectionProps {
  hasTimeline: boolean;
  hasGeneratedVideos: boolean;
  exportingVideo: boolean;
  exportProgress: string | null;
  allCinematicVideosGenerated: boolean;
  exportedVideoUrl: string | null;
  onExport: () => void;
  onDownload: () => void;
}

export function ExportSection({
  hasTimeline,
  hasGeneratedVideos,
  exportingVideo,
  exportProgress,
  allCinematicVideosGenerated,
  exportedVideoUrl,
  onExport,
  onDownload,
}: ExportSectionProps) {
  if (!hasTimeline || !hasGeneratedVideos) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-6 border-t">
      <Button
        onClick={onExport}
        disabled={exportingVideo || !allCinematicVideosGenerated}
        size="lg"
        className="min-w-[200px]"
      >
        {exportingVideo ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            {exportProgress || "Exporting..."}
          </>
        ) : (
          "Export Sizzle Reel"
        )}
      </Button>

      {!allCinematicVideosGenerated && !exportingVideo && (
        <p className="text-sm text-muted-foreground">
          Generate all cinematic videos to enable export
        </p>
      )}

      {exportedVideoUrl && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-green-600 font-medium">Sizzle reel complete!</p>
          <Button
            onClick={onDownload}
            variant="outline"
            size="sm"
          >
            Download Video
          </Button>
        </div>
      )}
    </div>
  );
}
