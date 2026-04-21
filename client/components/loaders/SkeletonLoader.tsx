"use client";

interface SkeletonLoaderProps {
  count?: number;
  height?: string;
  className?: string;
}

export default function SkeletonLoader({
  count = 3,
  height = "h-40",
  className = "",
}: SkeletonLoaderProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse`}
        />
      ))}
    </div>
  );
}
