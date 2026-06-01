"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  alt?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
}

const sizeMap: Record<string, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-3xl",
};

export default function Avatar({ src, alt = "", className, size = "md", fallback }: AvatarProps) {
  const [error, setError] = useState(false);
  const initial = (fallback || alt || "?").charAt(0).toUpperCase();

  return (
    <div className={cn(
      "rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden",
      sizeMap[size],
      className
    )}>
      {src && !error ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="select-none">{initial}</span>
      )}
    </div>
  );
}
