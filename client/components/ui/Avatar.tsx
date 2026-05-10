"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
}

/**
 * A reusable Avatar component that handles broken image URLs by falling back
 * to a default image.
 */
export default function Avatar({ 
  src, 
  alt, 
  className, 
  fallback = "/default-avatar.png" 
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state if the src prop changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <img
      src={hasError || !src ? fallback : src}
      alt={alt}
      className={cn("rounded-full object-cover", className)}
      onError={() => setHasError(true)}
    />
  );
}
