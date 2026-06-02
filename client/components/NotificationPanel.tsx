"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/lib/error";
import {
  ArrowRight,
  Bell,
  Heart,
  MessageCircle,
  MessageSquare,
  Trash2,
  UserCheck,
} from "lucide-react";
import ConfirmModal from "./modals/DeleteWarning";
import FollowRequestsModal from "./modals/FollowRequestsModal";
import FollowButton from "./ui/FollowButton";
import type { Notification } from "@/lib/types";
import { socket } from "@/socket/socket";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [senderFollowState, setSenderFollowState] = useState<
    Record<string, { isFollowing: boolean; isRequested: boolean }>
  >({});
  const [messageLoading, setMessageLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "like" | "comment" | "follow" | "message"
  >("all");
  const isFirstLoad = useRef(true);

  const getSenderName = (notification: Notification) =>
    notification.sender?.name || notification.sender?.username || "Someone";
  const getSenderUsername = (notification: Notification) =>
    notification.sender?.username || "unknown";
  const getSenderAvatar = (notification: Notification) =>
    notification.sender?.avatar || "/default-avatar.png";

  const fetchNotifications = useCallback(
    async (pageNum = 1) => {
      try {
        if (isFirstLoad.current && pageNum === 1) {
          setLoading(true);
          isFirstLoad.current = false;
        }

        const { data } = await axios.get<Notification[]>(
          `${BACKEND_URL}/api/notifications?page=${pageNum}&limit=10`,
          { withCredentials: true }
        );

        setHasMore(data.length >= 10);

        setNotifications((prev) => {
          if (prev.length === 0 && pageNum === 1) return data;

          const existingIds = new Set(prev.map((n) => n._id));
          const newNotifications = data.filter((n) => !existingIds.has(n._id));

          const updatedPrev = prev.map((prevNotification) => {
            const latest = data.find((d) => d._id === prevNotification._id);
            return latest ?? prevNotification;
          });

          return pageNum === 1
            ? [...newNotifications, ...updatedPrev]
            : [...updatedPrev, ...newNotifications];
        });

        setSenderFollowState((prev) => {
          const followStates = { ...prev };
          data.forEach((notification) => {
            if (notification.sender?._id) {
              followStates[notification.sender._id] = {
                isFollowing:
                  notification.sender.isFollowedByCurrentUser ?? false,
                isRequested:
                  notification.sender.isRequestedByCurrentUser ?? false,
              };
            }
          });
          return followStates;
        });
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, "Failed to fetch notifications"));
      } finally {
        setLoading(false);
      }
    },
    [BACKEND_URL]
  );

  const deleteSingle = async (id: string) => {
    if (deleteLoading[id]) return;

    setDeleteLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.delete(`${BACKEND_URL}/api/notifications/${id}`, {
        withCredentials: true,
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success("Notification deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Delete failed"));
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const deleteAll = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/api/notifications/all`, {
        withCredentials: true,
      });
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Delete all failed"));
    }
  };

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/notifications/read-all`,
        {},
        { withCredentials: true }
      );

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  }, [BACKEND_URL]);

  // const handleAcceptRequest = async (senderId: string) => {
  //   try {
  //     setFollowLoading((prev) => ({ ...prev, [senderId]: true }));
  //     await axios.put(
  //       `${BACKEND_URL}/api/users/${senderId}/accept-request`,
  //       {},
  //       { withCredentials: true }
  //     );
  //     toast.success("Follow request accepted");
  //     setNotifications((prev) =>
  //       prev.map((n) =>
  //         n.sender?._id === senderId && n.type === "follow_request"
  //           ? { ...n, type: "follow" as const }
  //           : n
  //       )
  //     );
  //     setSenderFollowState((prev) => ({
  //       ...prev,
  //       [senderId]: prev[senderId] || {
  //         isFollowing: false,
  //         isRequested: false,
  //       },
  //     }));
  //   } catch (err: unknown) {
  //     toast.error(getErrorMessage(err, "Action failed"));
  //   } finally {
  //     setFollowLoading((prev) => ({ ...prev, [senderId]: false }));
  //   }
  // };

  // const handleRejectRequest = async (senderId: string) => {
  //   try {
  //     setFollowLoading((prev) => ({ ...prev, [senderId]: true }));
  //     await axios.put(
  //       `${BACKEND_URL}/api/users/${senderId}/reject-request`,
  //       {},
  //       { withCredentials: true }
  //     );
  //     toast.success("Follow request rejected");
  //     setNotifications((prev) =>
  //       prev.filter(
  //         (n) => !(n.sender?._id === senderId && n.type === "follow_request")
  //       )
  //     );
  //   } catch (err: unknown) {
  //     toast.error(getErrorMessage(err, "Action failed"));
  //   } finally {
  //     setFollowLoading((prev) => ({ ...prev, [senderId]: false }));
  //   }
  // };

  const handleReplyToMessage = async (
    notificationId: string,
    senderId: string,
    conversationId?: string
  ) => {
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
      toast.error(getErrorMessage(err, "Failed to open chat"));
    } finally {
      setMessageLoading((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  useEffect(() => {
    if (!userData) return;

    const timeoutId = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    const intervalId = window.setInterval(() => {
      void fetchNotifications();
    }, 10000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [fetchNotifications, userData]);

  useEffect(() => {
    if (!userData) return;

    const handleNotification = () => {
      void fetchNotifications();
    };

    socket.on("notification:new", handleNotification);
    return () => {
      socket.off("notification:new", handleNotification);
    };
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
    post_removed_reported: "post removed reported",
    comment_removed_reported: "comment removed reported",
  };

  const FILTER_TABS = [
    { id: "all" as const, label: "All", Icon: Bell, types: null },
    { id: "like" as const, label: "Likes", Icon: Heart, types: ["like"] },
    {
      id: "comment" as const,
      label: "Comments",
      Icon: MessageSquare,
      types: ["comment"],
    },
    {
      id: "follow" as const,
      label: "Follows",
      Icon: UserCheck,
      types: ["follow", "follow_request_accepted"],
    },
    {
      id: "message" as const,
      label: "Messages",
      Icon: MessageCircle,
      types: ["message"],
    },
  ];

  const getTabCount = (types: string[] | null) =>
    notifications.filter((n) => {
      if (n.type === "follow_request") return false;
      return types === null || types.includes(n.type);
    }).length;

  const getTabUnreadCount = (types: string[] | null) =>
    notifications.filter((n) => {
      if (n.type === "follow_request") return false;
      const typeMatch = types === null || types.includes(n.type);
      return typeMatch && !n.isRead;
    }).length;

  const emptyStateConfig: Record<
    string,
    { icon: React.ElementType; message: string }
  > = {
    all: { icon: Bell, message: "You're all caught up!" },
    like: { icon: Heart, message: "No likes yet. Share something great!" },
    comment: {
      icon: MessageSquare,
      message: "No comments on your posts yet.",
    },
    follow: { icon: UserCheck, message: "No new follower notifications." },
    message: {
      icon: MessageCircle,
      message: "No message notifications.",
    },
  };

  const filteredNotifications = notifications.filter((n) => {
    if (n.type === "follow_request") return false;

    const activeTab = FILTER_TABS.find((t) => t.id === activeFilter);
    if (activeTab?.types && !activeTab.types.includes(n.type)) return false;

    const query = search.toLowerCase();
    if (query) {
      const searchable =
        `${getSenderName(n)} ${getSenderUsername(n)} ${typeText[n.type]}`.toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    return true;
  });

  return (
    <div className="w-full mt-5">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-3 md:gap-0">
        <p className="text-lg font-semibold text-foreground">Notifications</p>

        <div className="flex gap-2">
          {notifications.length > 0 && (
            <button
              onClick={() => setWarningOpen(true)}
              className="h-9 text-sm cursor-pointer w-[50%] md:w-25 py-1 bg-blue-600 text-white rounded-md"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {userData?.isPrivate && (userData.followRequests?.length || 0) > 0 && (
        <div
          onClick={() => setModalOpen(true)}
          className="mb-4 p-3 rounded-lg border border-border/50 bg-secondary/50 cursor-pointer flex justify-between items-center transition hover:bg-secondary"
        >
          <div>
            <p className="font-medium text-foreground text-sm">
              Pending follow requests
            </p>
            <p className="text-xs text-muted-foreground">
              {userData.followRequests?.length} requests waiting for approval
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <FollowRequestsModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="notif-tab-bar">
        {FILTER_TABS.map((tab) => {
          const count = getTabCount(tab.types);
          const unread = getTabUnreadCount(tab.types);
          const isActive = activeFilter === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`notif-tab${isActive ? " notif-tab-active" : ""}`}
            >
              <tab.Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && <span className="notif-tab-badge">{count}</span>}
              {unread > 0 && <span className="notif-tab-unread-dot" />}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="surface-text-muted text-sm">Loading notifications...</p>
      ) : filteredNotifications.length === 0 ? (
        (() => {
          const cfg = emptyStateConfig[activeFilter];
          const EmptyIcon = cfg.icon;

          return (
            <div className="notif-empty-state">
              <EmptyIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm surface-text-muted text-center">
                {cfg.message}
              </p>
            </div>
          );
        })()
      ) : (
        <div className="flex flex-col gap-2">
          {filteredNotifications.map((n) => {
            const senderId = n.sender?._id;

            return (
            <div
              key={n._id}
              className={`notification-card ${!n.isRead ? "notification-card-unread" : ""}`}
            >
              <div
                onClick={() => {
                  if (n.type === "post_removed_reported" || n.type === "comment_removed_reported") return;

                  if (n.post?._id) {
                    router.push(`/main/post/${n.post._id}`);
                  } else if (n.type === "message") {
                    if (senderId) {
                      void handleReplyToMessage(
                        n._id,
                        senderId,
                        n.conversation?._id
                      );
                    }
                  } else if (n.sender?.username) {
                    router.push(`/main/user/${n.sender.username}`);
                  }
                }}
                className="flex gap-3 flex-1 cursor-pointer p-2 rounded-lg"
              >
                {n.type === "post_removed_reported" || n.type === "comment_removed_reported" ? (
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <span className="text-red-500 text-lg">!</span>
                  </div>
                ) : (
                  <Image
                    alt={getSenderName(n)}
                    src={getSenderAvatar(n)}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}

                <div>
                  <p className="text-foreground">
                    {n.type === "post_removed_reported" ? (
                      <span className="text-red-500 font-semibold">
                        Post removed
                      </span>
                    ) : n.type === "comment_removed_reported" ? (
                      <span className="text-red-500 font-semibold">
                        Comment removed
                      </span>
                    ) : (
                      <span className="font-semibold">{getSenderName(n)}</span>
                    )}{" "}
                    {n.type === "follow" && "followed you"}
                    {n.type === "follow_request" && "wants to follow you"}
                    {n.type === "follow_request_accepted" &&
                      "accepted your follow request"}
                    {n.type === "like" && "liked your post"}
                    {n.type === "comment" && "commented on your post"}
                    {n.type === "message" && "messaged you"}
                    {n.type === "post_removed_reported" &&
                      "Your post was removed after receiving too many reports"}
                    {n.type === "comment_removed_reported" &&
                      "Your comment was removed after receiving too many reports"}
                  </p>

                  <p className="surface-text-muted mt-1 text-xs">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {n.type === "message" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (senderId) {
                          void handleReplyToMessage(
                            n._id,
                            senderId,
                            n.conversation?._id
                          );
                        }
                      }}
                      disabled={messageLoading[n._id] || !senderId}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-70 text-white rounded-md transition"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {messageLoading[n._id] ? "Loading..." : "Reply"}
                    </button>
                  )}

                  {n.type === "follow_request_accepted" && senderId && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          void handleReplyToMessage(
                            n._id,
                            senderId,
                            n.conversation?._id
                          );
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </button>
                    </div>
                  )}

                  {n.type === "follow" && senderId && (
                    <div onClick={(e) => e.stopPropagation()}>
                      {senderFollowState[senderId]?.isFollowing ? (
                        <button
                          onClick={() => {
                            void handleReplyToMessage(
                              n._id,
                              senderId,
                              n.conversation?._id
                            );
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </button>
                      ) : (
                        <FollowButton
                          userId={senderId}
                          isFollowing={false}
                          isRequested={
                            senderFollowState[senderId]?.isRequested ?? false
                          }
                          isFollowBack={true}
                          onFollowChange={(next) =>
                            setSenderFollowState((prev) => ({
                              ...prev,
                              [senderId]: {
                                isFollowing: next,
                                isRequested: false,
                              },
                            }))
                          }
                        />
                      )}
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (deleteLoading[n._id]) return;
                      setSingleDeleteId(n._id);
                    }}
                    disabled={deleteLoading[n._id]}
                    className="p-1 text-foreground transition hover:text-red-400 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}

      {hasMore && filteredNotifications.length > 0 && !loading && (
        <div className="flex justify-center mt-4 mb-2">
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              void fetchNotifications(nextPage);
            }}
            className="text-sm px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition"
          >
            Load More
          </button>
        </div>
      )}

      <ConfirmModal
        open={warningOpen}
        onClose={() => setWarningOpen(false)}
        onConfirm={() => {
          void deleteAll();
          setWarningOpen(false);
        }}
        title="Clear all notifications?"
        description="This will permanently delete all your notifications."
        confirmText="Clear All"
      />

      <ConfirmModal
        open={!!singleDeleteId}
        onClose={() => setSingleDeleteId(null)}
        onConfirm={() => {
          if (singleDeleteId) {
            void deleteSingle(singleDeleteId);
          }
          setSingleDeleteId(null);
        }}
        title="Delete notification?"
        description="Are you sure you want to delete this notification?"
        confirmText="Delete"
      />
    </div>
  );
}
