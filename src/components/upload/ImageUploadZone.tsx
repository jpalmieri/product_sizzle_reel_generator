interface ImageUploadZoneProps {
  baseImage: string | null;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function ImageUploadZone({
  baseImage,
  onImageUpload,
  disabled = false,
}: ImageUploadZoneProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Character Image *</label>
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          disabled={disabled}
          className={`absolute inset-0 w-full h-full opacity-0 z-10 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        />
        <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          baseImage
            ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
        }`}>
          {baseImage ? (
            <div className="space-y-2">
              <img
                src={baseImage}
                alt="Character reference"
                className="w-24 h-24 object-cover rounded-lg mx-auto"
              />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">✓ Character uploaded</p>
            </div>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="mt-2 text-sm font-medium">Drop character image here</p>
              <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Photo orientation/aspect ratio may influence cinematic shot composition
      </p>
    </div>
  );
}
