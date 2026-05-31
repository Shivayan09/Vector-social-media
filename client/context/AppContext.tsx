"use client";

import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Post } from "@/lib/types";
import { socket } from "@/socket/socket";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

axios.defaults.withCredentials = true;

export type User = {
  id: string;
  _id: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  username?: string;
  bio?: string;
  description?: string;
  avatar?: string;
  isProfileComplete: boolean;
  signupStep?: number;
  followers?: string[];
  following?: string[];
  isPrivate?: boolean;
  followRequests?: string[];
  blockedUsers?: string[];
};

type AppContextType = {
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;

  userData: User | null;
  setUserData: React.Dispatch<React.SetStateAction<User | null>>;

  isProfileComplete: boolean;

  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;

  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;

  refreshAuth: () => Promise<void>;
};

export const AppContext = createContext<AppContextType | undefined>(
  undefined
);

export function AppContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const router = useRouter();


  const [loading, setLoading] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const refreshAuth = useCallback(async () => {
    if (!BACKEND_URL) {
      setIsLoggedIn(false);
      setUserData(null);
      return;
    }

    try {
      setLoading(true); 

      const { data } = await axios.get<{ user: User }>(
        `${BACKEND_URL}/api/auth/me`,
        { withCredentials: true }
      );

      setIsLoggedIn(true);
      setUserData(data.user);
    } catch {
      setIsLoggedIn(false);
      setUserData(null);
    } finally {
      setLoading(false); 
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (!userData?.id) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }
    socket.connect();

    const onConnect = () => {
      socket.emit("register", userData.id);
    };

    const onBlocked = (data: { blockedUserId: string; blockerId: string }) => {
      setUserData((prev) => {
        if (!prev) return prev;
        const blocked = data.blockedUserId;
        const iInitiated = data.blockerId === prev._id;
        return {
          ...prev,
          blockedUsers: iInitiated
            ? prev.blockedUsers
              ? [...prev.blockedUsers, blocked]
              : [blocked]
            : prev.blockedUsers ?? [],
          following: prev.following
            ? prev.following.filter((id) => id !== blocked)
            : [],
          followers: prev.followers
            ? prev.followers.filter((id) => id !== blocked)
            : [],
        };
      });
    };

    const onUnblocked = (data: { unblockedUserId: string; blockerId: string }) => {
      setUserData((prev) => {
        if (!prev) return prev;
        if (data.blockerId !== prev._id) return prev;
        return {
          ...prev,
          blockedUsers: prev.blockedUsers
            ? prev.blockedUsers.filter((id) => id !== data.unblockedUserId)
            : [],
        };
      });
    };

    const onBookmarksInvalidated = (data: { userId: string }) => {
      setPosts((prev) => prev.filter((p) => {
        const authorId = typeof p.author === "string" ? p.author : p.author?._id;
        return authorId !== data.userId;
      }));
    };

    const onBlockLikesCleaned = (data: { targetUserId: string; postIds?: string[] }) => {
      if (!data?.targetUserId) return;

      setPosts((prev) =>
        prev.map((p) => {
          if (data.postIds?.length && !data.postIds.includes(p._id)) return p;

          const nextLikes = p.likes.filter((like) => {
            const likeUserId = typeof like === "string" ? like : like._id;
            return likeUserId !== data.targetUserId;
          });

          return nextLikes.length === p.likes.length ? p : { ...p, likes: nextLikes };
        })
      );
    };

    const onBlockCommentsCleaned = (data: {
      targetUserId: string;
      commentRemovals: Array<{ postId: string; count: number }>;
    }) => {
      if (!data?.commentRemovals?.length) return;

      setPosts((prev) =>
        prev.map((p) => {
          const removal = data.commentRemovals.find((r) => r.postId === p._id);
          if (!removal) return p;
          return {
            ...p,
            commentsCount: Math.max(0, (p.commentsCount || 0) - removal.count),
          };
        })
      );
    };

    const onNotificationNew = async (data: { notificationId?: string; type?: string }) => {
      try {
        if (typeof window !== "undefined" && window.location.pathname === "/main/activity") {
          return;
        }

        const { data: notifications } = await axios.get<any[]>(
          `${BACKEND_URL}/api/notifications?page=1&limit=1`,
          { withCredentials: true }
        );

        if (notifications && notifications[0]) {
          const notif = notifications[0];

          // Skip if stale (older than 10 seconds) or already read
          const isStale = new Date().getTime() - new Date(notif.createdAt).getTime() > 10000;
          if (notif.isRead || isStale) return;

          // Skip if message and already on that specific conversation page
          if (
            notif.type === "message" &&
            notif.conversation?._id &&
            typeof window !== "undefined" &&
            window.location.pathname.includes(`/main/chat/${notif.conversation._id}`)
          ) {
            return;
          }

          const senderName = notif.sender?.name || notif.sender?.username || "Someone";
          let message = "";

          switch (notif.type) {
            case "follow":
              message = `👤 ${senderName} followed you!`;
              break;
            case "follow_request":
              message = `📬 ${senderName} sent you a follow request!`;
              break;
            case "follow_request_accepted":
              message = `✅ ${senderName} accepted your follow request!`;
              break;
            case "like":
              message = `❤️ ${senderName} liked your post!`;
              break;
            case "comment":
              message = `💬 ${senderName} commented on your post!`;
              break;
            case "message":
              message = `✉️ New message from ${senderName}`;
              break;
            case "post_removed_reported":
              message = `⚠️ Your post was removed due to excessive reports.`;
              break;
            case "comment_removed_reported":
              message = `⚠️ Your comment was removed due to excessive reports.`;
              break;
            default:
              message = `🔔 New notification from ${senderName}`;
          }

          toast.info(message, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            onClick: () => {
              if (notif.type === "message" && notif.conversation?._id) {
                router.push(`/main/chat/${notif.conversation._id}`);
              } else if (notif.post?._id) {
                router.push(`/main/post/${notif.post._id}`);
              } else if (notif.sender?.username) {
                router.push(`/main/user/${notif.sender.username}`);
              }
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch notification details for toast:", err);
      }
    };

    socket.on("connect", onConnect);
    socket.on("user:blocked", onBlocked);
    socket.on("user:unblocked", onUnblocked);
    socket.on("bookmarks:invalidated", onBookmarksInvalidated);
    socket.on("block:likes_cleaned", onBlockLikesCleaned);
    socket.on("block:comments_cleaned", onBlockCommentsCleaned);
    socket.on("notification:new", onNotificationNew);

    socket.emit("register", userData.id);

    return () => {
      socket.off("connect", onConnect);
      socket.off("user:blocked", onBlocked);
      socket.off("user:unblocked", onUnblocked);
      socket.off("bookmarks:invalidated", onBookmarksInvalidated);
      socket.off("block:likes_cleaned", onBlockLikesCleaned);
      socket.off("block:comments_cleaned", onBlockCommentsCleaned);
      socket.off("notification:new", onNotificationNew);
      socket.disconnect();
    };
  }, [userData?.id, BACKEND_URL, router]);

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        userData,
        setUserData,
        isProfileComplete: !!userData?.isProfileComplete,
        posts,
        setPosts,
        loading,
        setLoading,
        refreshAuth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      "useAppContext must be used within AppContextProvider"
    );
  }

  return context;
}
