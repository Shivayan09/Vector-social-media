"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/lib/useMounted";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return <div className="h-10 w-10" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-all duration-300",
        "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10",
        "hover:scale-105 active:scale-95"
      )}
      aria-label="Toggle theme"
    >
      <div className="relative h-5 w-5">
        <Sun 
          className={cn(
            "absolute inset-0 h-5 w-5 text-orange-500 transition-all duration-500 transform",
            isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          )} 
        />
        <Moon 
          className={cn(
            "absolute inset-0 h-5 w-5 text-indigo-400 transition-all duration-500 transform",
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          )} 
        />
      </div>
    </button>
  );
}

