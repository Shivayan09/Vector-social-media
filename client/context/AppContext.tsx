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

    const onBlocked = (data: { blockedUserId: string }) => {
      setUserData((prev) => {
        if (!prev) return prev;
        const blocked = data.blockedUserId;
        return {
          ...prev,
          blockedUsers: prev.blockedUsers
            ? [...prev.blockedUsers, blocked]
            : [blocked],
          following: prev.following
            ? prev.following.filter((id) => id !== blocked)
            : [],
          followers: prev.followers
            ? prev.followers.filter((id) => id !== blocked)
            : [],
        };
      });
    };

    const onUnblocked = (data: { unblockedUserId: string }) => {
      setUserData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          blockedUsers: prev.blockedUsers
            ? prev.blockedUsers.filter((id) => id !== data.unblockedUserId)
            : [],
        };
      });
    };

    socket.on("connect", onConnect);
    socket.on("user:blocked", onBlocked);
    socket.on("user:unblocked", onUnblocked);

    socket.emit("register", userData.id);

    return () => {
      socket.off("connect", onConnect);
      socket.off("user:blocked", onBlocked);
      socket.off("user:unblocked", onUnblocked);
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
