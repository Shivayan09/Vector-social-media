"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";

export default function NotificationBell() {
  const { userData } = useAppContext();
  const router = useRouter();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/notifications`, { withCredentials: true });
      const unread = data.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    if (userData) {
      fetchUnreadCount();
    }
  }, [userData]);

  if (!userData) return null;

  return (
    <button onClick={() => router.push("/main/activity")} className="relative p-2 rounded-full hover:bg-blue-400/15 dark:hover:bg-blue-400/20">
      <Bell className="h-5 w-5 cursor-pointer" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-red-500 text-white rounded-full flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
