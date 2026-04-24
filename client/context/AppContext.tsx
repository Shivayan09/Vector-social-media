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

axios.defaults.withCredentials = true;

export type User = {
  id: string;
  _id?: string;
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

const AppContext = createContext<AppContextType | undefined>(
  undefined
);

export function AppContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);

  // 🔥 IMPORTANT: default false rakho (warna hamesha loader dikhega)
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
      setLoading(true); // ✅ loader start

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
      setLoading(false); // ✅ loader stop
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

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
