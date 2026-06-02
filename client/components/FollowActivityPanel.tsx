"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import axios from "axios";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/lib/error";
import { UserSummary } from "@/lib/types";
import { UserMinus, Check, X, ShieldAlert } from "lucide-react";

export default function FollowActivityPanel({
  pendingFollowCount,
  setPendingFollowCount,
}: {
  pendingFollowCount: number;
  setPendingFollowCount: (count: number) => void;
}) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  
  const [received, setReceived] = useState<UserSummary[]>([]);
  const [sent, setSent] = useState<UserSummary[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  const fetchReceived = useCallback(async () => {
    try {
      setLoadingReceived(true);
      const { data } = await axios.get<UserSummary[]>(`${BACKEND_URL}/api/users/follow-requests`, {
        withCredentials: true,
      });
      setReceived(data);
      setPendingFollowCount(data.length);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load received follow requests"));
    } finally {
      setLoadingReceived(false);
    }
  }, [BACKEND_URL, setPendingFollowCount]);

  const fetchSent = useCallback(async () => {
    try {
      setLoadingSent(true);
      const { data } = await axios.get<UserSummary[]>(`${BACKEND_URL}/api/users/follow-requests/sent`, {
        withCredentials: true,
      });
      setSent(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load sent follow requests"));
    } finally {
      setLoadingSent(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    void fetchReceived();
    void fetchSent();
  }, [fetchReceived, fetchSent]);

  const handleAccept = async (id: string) => {
    if (actionLoading[id]) return;
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.put(`${BACKEND_URL}/api/users/${id}/accept-request`, {}, { withCredentials: true });
      await fetchReceived();
      toast.success("Follow request accepted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to accept request"));
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id: string) => {
    if (actionLoading[id]) return;
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.put(`${BACKEND_URL}/api/users/${id}/reject-request`, {}, { withCredentials: true });
      await fetchReceived();
      toast.success("Follow request rejected");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to reject request"));
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleCancel = async (id: string) => {
    if (actionLoading[id]) return;
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await axios.put(`${BACKEND_URL}/api/users/${id}/follow`, {}, { withCredentials: true });
      if (res.data.requested === false) {
        await fetchSent();
        toast.success("Follow request cancelled");
      } else {
        toast.info(res.data.message || "Follow request state updated");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to cancel follow request"));
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const renderSkeleton = () => (
    <div className="flex flex-col gap-3 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-card/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted/60" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-24 rounded bg-muted/60 animate-none" />
              <div className="h-3 w-16 rounded bg-muted/40 animate-none" />
            </div>
          </div>
          <div className="h-8 w-20 rounded bg-muted/60 animate-none" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-5">
      {/* Tab Switcher */}
      <div className="mb-6 flex justify-center border-b border-border/80 gap-10 md:gap-20">
        {[
          { id: "received", label: `Received Requests (${received.length})` },
          { id: "sent", label: `Sent Requests (${sent.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() =>
              setActiveTab(tab.id as "received" | "sent")
            }
            className={`relative pb-2 font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "text-blue-500 dark:text-blue-300"
                : "text-foreground/75 hover:text-foreground"
            }`}
          >
            {tab.label}

            {activeTab === tab.id && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "received" ? (
          <div className="flex flex-col">
            {loadingReceived ? (
              renderSkeleton()
            ) : received.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-border/40 rounded-xl bg-secondary/10">
                <ShieldAlert className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm surface-text-muted">No pending received requests.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {received.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/10 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={user.avatar || "/default-avatar.png"}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover border border-border/50"
                      />
                      <div>
                        <p className="font-semibold text-sm text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(user._id)}
                        disabled={actionLoading[user._id]}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition duration-200 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(user._id)}
                        disabled={actionLoading[user._id]}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary-foreground/10 text-foreground border border-border/80 rounded-md transition duration-200 cursor-pointer disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {loadingSent ? (
              renderSkeleton()
            ) : sent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-border/40 rounded-xl bg-secondary/10">
                <UserMinus className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm surface-text-muted">No pending sent requests.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sent.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/10 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={user.avatar || "/default-avatar.png"}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover border border-border/50"
                      />
                      <div>
                        <p className="font-semibold text-sm text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => handleCancel(user._id)}
                        disabled={actionLoading[user._id]}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary-foreground/10 text-foreground border border-border/80 rounded-md transition duration-200 cursor-pointer disabled:opacity-50"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        Cancel Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
