"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import type { Notification } from "@/lib/types";

export default function NotificationBell() {
  const { userData } = useAppContext();
  const router = useRouter();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get<Notification[]>(
        `${BACKEND_URL}/api/notifications`,
        { withCredentials: true }
      );
      const unread = data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch {
      console.error("Failed to fetch notifications");
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    if (!userData) return;
    const timeoutId = window.setTimeout(() => {
      void fetchUnreadCount();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchUnreadCount, userData]);

  if (!userData) return null;

  return (
    <button onClick={() => router.push("/main/activity")} className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
      <Bell className="h-5 w-5 cursor-pointer" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-red-500 text-white rounded-full flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
