"use client";

import ActivitySidebar from "@/components/layouts/ActivitySidebar";
import NotificationsPanel from "@/components/NotificationPanel";
import { Search } from "lucide-react";
import { useState } from "react";

export default function Activity() {
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-screen">
      <div className="w-full py-5 px-7 flex flex-col">
        <p className="page-title">
          Activity Panel
        </p>

        <div className="search-pill mt-5">
          <Search className="h-5" />
          <input
            type="text"
            placeholder="Search notifications"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-full w-full bg-transparent outline-0 placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex-1 mt-5 overflow-y-auto hide-scrollbar">
          <NotificationsPanel search={search} />
        </div>
      </div>

      <ActivitySidebar />
    </div>
  );
}
