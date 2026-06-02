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

    socket.on("connect", onConnect);
    socket.on("user:blocked", onBlocked);
    socket.on("user:unblocked", onUnblocked);
    socket.on("bookmarks:invalidated", onBookmarksInvalidated);
    socket.on("block:likes_cleaned", onBlockLikesCleaned);
    const onConversationDeleted = (data: { conversationId: string }) => {
      // Full deletion — both participants deleted
      // The conversation no longer exists in the database
    };

    const onParticipantDeleted = (data: { conversationId: string; deletedBy: string }) => {
      // Soft deletion — one participant deleted, conversation still exists
    };

    socket.on("block:comments_cleaned", onBlockCommentsCleaned);
    socket.on("conversation:deleted", onConversationDeleted);
    socket.on("conversation:participant_deleted", onParticipantDeleted);

    socket.emit("register", userData.id);

    return () => {
      socket.off("connect", onConnect);
      socket.off("user:blocked", onBlocked);
      socket.off("user:unblocked", onUnblocked);
      socket.off("bookmarks:invalidated", onBookmarksInvalidated);
      socket.off("block:likes_cleaned", onBlockLikesCleaned);
      socket.off("block:comments_cleaned", onBlockCommentsCleaned);
      socket.off("conversation:deleted", onConversationDeleted);
      socket.off("conversation:participant_deleted", onParticipantDeleted);
      socket.disconnect();
    };
  }, [userData?.id]);

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
