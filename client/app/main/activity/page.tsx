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
        <p className="text-[1.4rem] font-semibold text-center md:text-left text-white">
          Activity Panel
        </p>

        <div className="neo-input flex items-center px-2 gap-2 mt-5 rounded-full h-10">
          <Search className="h-5" />
          <input
            type="text"
            placeholder="Search notifications"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="outline-0 w-full h-full bg-transparent"
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