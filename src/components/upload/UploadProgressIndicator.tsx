interface UploadProgressIndicatorProps {
  current: number;
  total: number;
  itemName?: string;
}

export function UploadProgressIndicator({
  current,
  total,
  itemName = "video",
}: UploadProgressIndicatorProps) {
  if (current <= 0 || total <= 0) {
    return null;
  }

  const remaining = total - current;
  const pluralizedItemName = total > 1 ? `${itemName}s` : itemName;

  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <div className="animate-spin h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full shrink-0"></div>
      <p className="text-sm text-blue-900 dark:text-blue-100">
        Processing {remaining} of {total} {pluralizedItemName}...
      </p>
    </div>
  );
}
