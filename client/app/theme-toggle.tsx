"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/lib/useMounted";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex cursor-pointer items-center justify-center rounded-lg p-2 transition-colors duration-300 hover:bg-black/5 dark:hover:bg-white/5"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </button>
  );
}
