"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/lib/useMounted";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex cursor-pointer items-center gap-3 text-foreground"
    >
      <div
        className={`flex h-6 w-12 border-2 items-center rounded-full p-1 transition-colors duration-300 ${
          isDark ? "bg-primary" : "glass-surface"
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full bg-black/30 dark:bg-white shadow-md transform transition-transform duration-300 ${
            isDark ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </div>
      <span className="font-medium surface-text-muted">
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}
