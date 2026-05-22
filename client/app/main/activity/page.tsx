"use client";

import ActivitySidebar from "@/components/layouts/ActivitySidebar";
import NotificationsPanel from "@/components/NotificationPanel";
import FollowActivityPanel from "@/components/FollowActivityPanel";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Activity() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"notifications" | "follow_activity">("notifications");
    const [pendingFollowCount, setPendingFollowCount] = useState(0);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

useEffect(() => {
  const fetchPendingFollowRequests = async () => {
    try {
      const { data } = await axios.get(
        `${BACKEND_URL}/api/users/follow-requests`,
        {
          withCredentials: true,
        }
      );

      setPendingFollowCount(data.length);
    } catch (error) {
      console.error("Failed to fetch pending follow requests");
    }
  };

  fetchPendingFollowRequests();
}, [BACKEND_URL]);
  return (
    <div className="flex h-screen">
      <div className="w-full py-5 px-7 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="page-title">
            {view === "notifications" ? "Activity Panel" : "Follow Activity"}
          </p>
         <button
  onClick={() =>
    setView(
      view === "notifications"
        ? "follow_activity"
        : "notifications"
    )
  }
  className="relative self-center sm:self-auto px-4 py-2 text-sm font-semibold rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
>
  {view === "notifications"
    ? "Follow Activity"
    : "Notifications"}

  {view === "notifications" && pendingFollowCount > 0 && (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
      {pendingFollowCount}
    </span>
  )}
</button>
        </div>

        <div className="flex-grow flex flex-col mt-5 overflow-hidden">
         {view === "notifications" ? (
  <>
    <div className="search-pill">
      <Search className="h-5 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search notifications"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-full w-full bg-transparent outline-0 placeholder:text-muted-foreground text-foreground"
      />
    </div>

    <div className="flex-1 mt-5 overflow-y-auto hide-scrollbar">
      <NotificationsPanel search={search} />
    </div>
  </>
) : (
  <div className="flex-1 overflow-y-auto hide-scrollbar">
    <FollowActivityPanel
      pendingFollowCount={pendingFollowCount}
      setPendingFollowCount={setPendingFollowCount}
    />
  </div>
)}
        </div>
      </div>

      <ActivitySidebar />
    </div>
  );
}

