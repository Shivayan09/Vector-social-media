"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
}

/**
 * A reusable Avatar component that handles broken image URLs by falling back
 * to a default image. Using the 'key' prop on the Image component ensures the state 
 * resets when the src changes.
 */
export default function Avatar({ 
  src, 
  alt, 
  className, 
  fallback = "/default-avatar.png" 
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      key={src}
      src={hasError || !src ? fallback : src}
      alt={alt}
      width={48}
      height={48}
      className={cn("rounded-full object-cover", className)}
      onError={() => setHasError(true)}
    />
  );
}
