"use client";

import ActivitySidebar from "@/components/layouts/ActivitySidebar";
import NotificationsPanel from "@/components/NotificationPanel";
import { Search } from "lucide-react";
import { useState } from "react";
import FollowRequestsModal from "@/components/modals/FollowRequestsModal";
import { useAppContext } from "@/context/AppContext";

export default function Activity() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const { userData } = useAppContext();

  return (
    <div className="flex h-screen">
      <div className="w-full py-5 px-7 flex flex-col">
        <p className="page-title">
          Activity Panel
        </p>

        {userData?.isPrivate && (userData?.followRequests?.length || 0) > 0 && (
          <div 
            onClick={() => setModalOpen(true)} 
            className="mt-4 p-3 rounded-lg border border-border/50 bg-secondary/50 cursor-pointer flex justify-between items-center transition hover:bg-secondary"
          >
            <div>
              <p className="font-medium text-foreground text-sm">Follow Requests</p>
              <p className="text-xs text-muted-foreground">{userData.followRequests?.length} pending requests</p>
            </div>
            <button className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md">
              View
            </button>
          </div>
        )}

        <FollowRequestsModal open={modalOpen} onClose={() => setModalOpen(false)} />

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
