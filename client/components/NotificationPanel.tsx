"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Trash2, MessageCircle, UserPlus, ArrowRight } from "lucide-react";
import ConfirmModal from "./modals/DeleteWarning";
import FollowRequestsModal from "./modals/FollowRequestsModal";
import type { Notification } from "@/lib/types";

type Props = {
  search?: string;
};

export default function NotificationPanel({ search = "" }: Props) {
  const { userData } = useAppContext();
  const router = useRouter();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});
  const [messageLoading, setMessageLoading] = useState<Record<string, boolean>>({});
  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<Notification[]>(
        `${BACKEND_URL}/api/notifications`,
        { withCredentials: true }
      );
      setNotifications(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(
          err.response?.data?.message ||
            "Failed to fetch notifications"
        );
      } else {
        toast.error("Failed to fetch notifications");
      }
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  const deleteSingle = async (id: string) => {
    if (deleteLoading[id]) return;

    setDeleteLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.delete(
        `${BACKEND_URL}/api/notifications/${id}`,
        { withCredentials: true }
      );
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success("Notification deleted");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Delete failed");
      } else {
        toast.error("Delete failed");
      }
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const deleteSelected = async () => {
    if (selected.length === 0) return;

    try {
      await axios.post(
        `${BACKEND_URL}/api/notifications/bulk-delete`,
        { ids: selected },
        { withCredentials: true }
      );

      setNotifications((prev) =>
        prev.filter((n) => !selected.includes(n._id))
      );

      setSelected([]);
      setSelectMode(false);

      toast.success("Selected notifications deleted");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(
          err.response?.data?.message || "Bulk delete failed"
        );
      } else {
        toast.error("Bulk delete failed");
      }
    }
  };

  const deleteAll = async () => {
    try {
      await axios.delete(
        `${BACKEND_URL}/api/notifications/all`,
        { withCredentials: true }
      );
      setNotifications([]);
      setSelected([]);
      setSelectMode(false);
      toast.success("All notifications cleared");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(
          err.response?.data?.message || "Delete all failed"
        );
      } else {
        toast.error("Delete all failed");
      }
    }
  };

  const markAllAsRead = useCallback(async () => {
    try {
      const unread = notifications.filter((n) => !n.isRead);

      await Promise.all(
        unread.map((n) =>
          axios.put(
            `${BACKEND_URL}/api/notifications/${n._id}/read`,
            {},
            { withCredentials: true }
          )
        )
      );

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (err) {
      console.error(err);
    }
  }, [BACKEND_URL, notifications]);

  const isFollowingUser = (userId: string) => {
    return userData?.following?.includes(userId) ?? false;
  };

  const handleFollowBack = async (senderId: string) => {
    try {
      setFollowLoading((prev) => ({ ...prev, [senderId]: true }));
      const res = await axios.put(
        `${BACKEND_URL}/api/users/${senderId}/follow`,
        {},
        { withCredentials: true }
      );
      if (res.data.followed) {
        toast.success("Followed successfully");
      } else {
        toast.success("Unfollowed successfully");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Follow action failed");
      } else {
        toast.error("Follow action failed");
      }
    } finally {
      setFollowLoading((prev) => ({ ...prev, [senderId]: false }));
    }
  };

  const handleAcceptRequest = async (senderId: string) => {
    try {
      setFollowLoading((prev) => ({ ...prev, [senderId]: true }));
      await axios.put(
        `${BACKEND_URL}/api/users/${senderId}/accept`,
        {},
        { withCredentials: true }
      );
      toast.success("Follow request accepted");
      // Update local state to remove the request notification or change its type
      setNotifications(prev => prev.map(n => 
        (n.sender?._id === senderId && n.type === "follow_request") 
        ? { ...n, type: "follow" as const } 
        : n
      ));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Action failed");
      }
    } finally {
      setFollowLoading((prev) => ({ ...prev, [senderId]: false }));
    }
  };

  const handleRejectRequest = async (senderId: string) => {
    try {
      setFollowLoading((prev) => ({ ...prev, [senderId]: true }));
      await axios.put(
        `${BACKEND_URL}/api/users/${senderId}/reject`,
        {},
        { withCredentials: true }
      );
      toast.success("Follow request rejected");
      setNotifications(prev => prev.filter(n => !(n.sender?._id === senderId && n.type === "follow_request")));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Action failed");
      }
    } finally {
      setFollowLoading((prev) => ({ ...prev, [senderId]: false }));
    }
  };

  const handleReplyToMessage = async (notificationId: string, senderId: string, conversationId?: string) => {
    try {
      setMessageLoading((prev) => ({ ...prev, [notificationId]: true }));

      if (conversationId) {
        router.push(`/main/chat/${conversationId}`);
        return;
      }

      const { data } = await axios.post(
        `${BACKEND_URL}/api/conversation`,
        { receiverId: senderId },
        { withCredentials: true }
      );
      router.push(`/main/chat/${data._id}`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to open chat");
      } else {
        toast.error("Failed to open chat");
      }
    } finally {
      setMessageLoading((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  useEffect(() => {
    if (!userData) return;
    const timeoutId = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchNotifications, userData]);

  useEffect(() => {
    if (!notifications.some((n) => !n.isRead)) return;
    const timeoutId = window.setTimeout(() => {
      void markAllAsRead();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [markAllAsRead, notifications]);

  if (!userData) return null;

  const typeText: Record<string, string> = {
    follow: "follow followed",
    like: "like liked",
    comment: "comment commented",
    message: "message messaged",
    follow_request: "follow request requested",
    follow_request_accepted: "accepted your follow request",
  };

  const filteredNotifications = notifications.filter(
    (n): n is Notification & { sender: Exclude<Notification["sender"], null> } => {
      if (n.type === "follow_request") return false;
      if (n.sender == null) return false;
      const query = search.toLowerCase();
      const searchable = `${n.sender.name} ${n.sender.username} ${typeText[n.type]}`.toLowerCase();
      return searchable.includes(query);
    }
  );

  return (
    <div className="w-full mt-5">

      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-3 md:gap-0">
        <p className="text-lg font-semibold text-foreground">
          Notifications
        </p>

        <div className="flex gap-2">
          {selectMode && selected.length > 0 && (
            <button onClick={deleteSelected} className="h-9 text-sm w-35 cursor-pointer bg-blue-600 text-white rounded-md">
              Delete Selected
            </button>
          )}

          {notifications.length > 0 && (
            <button onClick={() => setWarningOpen(true)} className="h-9 text-sm cursor-pointer w-[50%] md:w-25 py-1 bg-blue-600 text-white rounded-md">
              Clear All
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => {
                setSelectMode((prev) => !prev);
                setSelected([]);
              }}
              className="h-9 text-sm cursor-pointer w-[50%] md:w-25 rounded-md bg-blue-600 text-white">
              {selectMode ? "Cancel" : "Select"}
            </button>
          )}
        </div>
      </div>

      {userData?.isPrivate && (userData?.followRequests?.length || 0) > 0 && (
        <div 
          onClick={() => setModalOpen(true)} 
          className="mb-4 p-3 rounded-lg border border-border/50 bg-secondary/50 cursor-pointer flex justify-between items-center transition hover:bg-secondary"
        >
          <div>
            <p className="font-medium text-foreground text-sm">Pending follow requests</p>
            <p className="text-xs text-muted-foreground">{userData.followRequests?.length} requests waiting for approval</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <FollowRequestsModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {loading ? (
        <p className="surface-text-muted text-sm">
          Loading notifications...
        </p>
      ) : filteredNotifications.length === 0 ? (
        <p className="surface-text-muted text-sm">
          No notifications match your search.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredNotifications.map((n) => (
            <div key={n._id}
              className={`notification-card ${!n.isRead ? "notification-card-unread" : ""
                }`}>
              {selectMode && (
                <input type="checkbox" className="h-4 w-4 cursor-pointer"
                  checked={selected.includes(n._id)}
                  onChange={() =>
                    setSelected((prev) =>
                      prev.includes(n._id)
                        ? prev.filter((id) => id !== n._id)
                        : [...prev, n._id]
                    )
                  }
                />
              )}

              <div
                onClick={() => {
                  if (!selectMode) {
                    if (n.post?._id) {
                      router.push(`/main/post/${n.post._id}`);
                    } else if (n.type === "message") {
                      void handleReplyToMessage(n._id, n.sender._id, n.conversation?._id);
                    } else {
                      router.push(`/main/user/${n.sender.username}`);
                    }
                  }
                }}
                className="flex gap-3 flex-1 cursor-pointer p-2 rounded-lg">
                <img alt={n.sender.name || "Notification sender"} src={n.sender.avatar || "/default-avatar.png"} className="h-10 w-10 rounded-full object-cover" />

                <div>
                  <p className="text-foreground">
                    <span className="font-semibold">
                      {n.sender.name}
                    </span>{" "}
                    {n.type === "follow" && "followed you"}
                    {n.type === "follow_request" && "wants to follow you"}
                    {n.type === "like" && "liked your post"}
                    {n.type === "comment" &&
                      "commented on your post"}
                    {n.type === "message" && "messaged you"}
                  </p>

                  <p className="surface-text-muted mt-1 text-xs">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>

                {!selectMode && (
                  <div className="flex items-center gap-2 ml-auto">
                    {n.type === "message" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleReplyToMessage(n._id, n.sender._id, n.conversation?._id);
                        }}
                        disabled={messageLoading[n._id]}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-70 text-white rounded-md transition"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {messageLoading[n._id] ? "Loading..." : "Reply"}
                      </button>
                    )}
                    {n.type === "follow_request" && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptRequest(n.sender._id);
                          }}
                          disabled={followLoading[n.sender._id]}
                          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                        >
                          {followLoading[n.sender._id] ? "..." : "Accept"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectRequest(n.sender._id);
                          }}
                          disabled={followLoading[n.sender._id]}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-foreground rounded-md transition"
                        >
                          {followLoading[n.sender._id] ? "..." : "Reject"}
                        </button>
                      </div>
                    )}
                    {n.type === "follow" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isFollowingUser(n.sender._id)) {
                            handleFollowBack(n.sender._id);
                          }
                        }}
                        disabled={followLoading[n.sender._id] || isFollowingUser(n.sender._id)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition ${
                          isFollowingUser(n.sender._id)
                            ? "bg-gray-600 text-gray-300 cursor-default"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        <UserPlus className="h-4 w-4" />
                        {followLoading[n.sender._id]
                          ? "Loading..."
                          : isFollowingUser(n.sender._id)
                          ? "Following"
                          : "Follow back"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (deleteLoading[n._id]) return;
                        void deleteSingle(n._id);
                      }}
                      disabled={deleteLoading[n._id]}
                      className="p-1 text-foreground transition hover:text-red-400 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Trash2 className="h-5 cursor-pointer" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={warningOpen}
        onClose={() => setWarningOpen(false)}
        onConfirm={() => {
          deleteAll();
          setWarningOpen(false);
        }}
        title="Clear all notifications?"
        description="This will permanently delete all your notifications."
        confirmText="Clear All"
      />
    </div>
  );
}
