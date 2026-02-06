"use client";

import axios from "axios";
import {createContext, useContext, useEffect, useState, ReactNode} from "react";

axios.defaults.withCredentials = true;

export type User = {
  id: string;
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
};

export type Post = any;

type AppContextType = {
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;

  userData: User | null;
  setUserData: React.Dispatch<React.SetStateAction<User | null>>;

  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;

  loading: boolean;
  refreshAuth: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [posts, setPosts] = useState<Post[]>([]);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const refreshAuth = async () => {
    if (!BACKEND_URL) {
      setIsLoggedIn(false);
      setUserData(null);
      return;
    }
    try {
      const { data } = await axios.get<{ user: User }>(BACKEND_URL + "/api/auth/me");
      setIsLoggedIn(true);
      setUserData(data.user);
    } catch {
      setIsLoggedIn(false);
      setUserData(null);
    }
  };

  useEffect(() => {
    refreshAuth().finally(() => setLoading(false));
  }, []);

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        userData,
        setUserData,
        posts,
        setPosts,
        loading,
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
    throw new Error("useAppContext must be used within AppContextProvider");
  }

  return context;
}
