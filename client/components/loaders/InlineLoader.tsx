"use client";

interface InlineLoaderProps {
  text?: string;
  className?: string;
}

export default function InlineLoader({
  text = "Loading...",
  className = "",
}: InlineLoaderProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`} role="status" aria-live="polite">
      <div
        aria-hidden="true"
        className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"
      />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}
