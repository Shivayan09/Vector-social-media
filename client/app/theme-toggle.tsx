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
      className="flex items-center gap-3 cursor-pointer"
    >
      

      <div
        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
          isDark ? "bg-blue-500" : "bg-transparent border"
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
            isDark ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </div>
      <span className="font-medium">
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}
