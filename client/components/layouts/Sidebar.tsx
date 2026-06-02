"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Home, Search, Bell, User, Plus, Menu, X, Settings, LogOut, Send, LifeBuoy, Star } from "lucide-react";
import CreateModal from "../modals/CreatePostModal";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/lib/error";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import LogoutWarning from "../modals/LogoutWarning";
import ThemeToggle from "@/app/theme-toggle";
import type { Post } from "@/lib/types";
import { socket } from "@/socket/socket";

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  unreadCount?: number;
}

export default function Sidebar() {
  const [open, setOpen] = useState<boolean>(true);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const { isLoggedIn, setIsLoggedIn, setUserData, userData, setPosts } = useAppContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const handleLogout = async () => {
    try {
      const { data } = await axios.post(BACKEND_URL + "/api/auth/logout", {}, { withCredentials: true });
      if (data.success) {
        socket.disconnect();
        setIsLoggedIn(false);
        setUserData(null);
        setPosts([]);
        toast.success("Logged out successfully!");
        router.replace("/auth/login");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get<{ unreadCount: number }>(
        `${BACKEND_URL}/api/notifications?countOnly=true`,
        { withCredentials: true }
      );
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      console.error("Failed to fetch notifications");
    }
  }, [BACKEND_URL]);

  const fetchUnreadMessageCount = useCallback(async () => {
    try {
      const response = await axios.get<
        { unreadCount: number }[]
      >(`${BACKEND_URL}/api/conversation`, 
        { withCredentials: true, });
      const conversations = Array.isArray(response.data) ? response.data : [];
      const unreadMessages = conversations.filter(
        (conversation) => (conversation.unreadCount ?? 0) > 0
      ).length;
      setUnreadMessageCount(unreadMessages);
    } catch (error) {
      console.error("Failed to fetch unread message count:", error);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchUnreadCount();
    }, 0);
    const interval = window.setInterval(() => {
      void fetchUnreadCount();
    }, 10000);
    const handleNotification = () => {
      void fetchUnreadCount();
    };
    socket.on("notification:new", handleNotification);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(interval);
      socket.off("notification:new", handleNotification);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    let isMounted = true;

    const fetchAndUpdate = async () => {
      if (isMounted) {
        await fetchUnreadMessageCount();
      }
    };

    void fetchAndUpdate();

    const messageInterval = window.setInterval(() => {
      if (isMounted) void fetchUnreadMessageCount();
    }, 10000);

    const handleNotification = () => {
      if (isMounted) void fetchUnreadMessageCount();
    };

    socket.on("notification:new", handleNotification);

    return () => {
      isMounted = false;
      window.clearInterval(messageInterval);
      socket.off("notification:new", handleNotification);
    };
  }, [fetchUnreadMessageCount]);

  const isMain = pathname === "/main";

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`fixed z-60 p-2 rounded-lg ${open? "top-4 left-40 md:left-45":isMain ? "top-7.5 left-6" : "top-4 left-3"
          } text-slate-900 dark:text-white transition-all duration-300 ease-in-out`}
        aria-label="Toggle menu"
      >
        {open ? <X className="size-5 cursor-pointer" /> : <Menu className="size-7 cursor-pointer" />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`fixed md:static top-0 left-0 z-50 h-screen overflow-hidden! hide-scrollbar text-slate-900 dark:text-white 
  ${open ? "w-50 md:w-55" : "w-0 md:w-16"} 
  border-r border-border shadow-lg flex flex-col gap-5 px-2 py-5 font-serif text-[1.1rem] bg-background
  transform transition-all duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex w-full">
          <div className="flex justify-center ml-3">
            <Image
              alt={userData?.name || "User avatar"}
              src={userData?.avatar || "/default-avatar.png"}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover border shrink-0"
            />

            <div className="flex flex-col ml-3">
              <p className="font-semibold text-[1.1rem]">Hello</p>
              <p className="text-slate-600 dark:text-gray-300">{userData?.name}!</p>
            </div>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-5">
          <SidebarItem
            icon={<Home className="h-5 md:h-7" />}
            label="Home"
            href="/main"
            active={pathname === "/main"}
          />

          <SidebarItem
            icon={<Search className="h-5 md:h-7" />}
            label="Explore"
            href="/main/explore"
            active={pathname === "/main/explore"}
          />

          <SidebarItem
            icon={<Plus className="h-5 md:h-7" />}
            label="Create"
            onClick={() => setCreateOpen(true)}
          />

          <SidebarItem
            icon={<Bell className="h-5 md:h-7" />}
            label="Activity"
            href="/main/activity"
            active={pathname === "/main/activity"}
            unreadCount={unreadCount}
          />

          <SidebarItem
            icon={<Send className="h-5 md:h-7" />}
            label="Messages"
            href="/main/chat"
            active={pathname === "/main/chat"}
            unreadCount={unreadMessageCount}
          />

          <SidebarItem
            icon={<User className="h-5 md:h-7" />}
            label="Profile"
            href={`/main/user/${userData?.username}`}
            active={pathname === `/main/user/${userData?.username}`}
          />

          <SidebarItem
            icon={<Settings className="h-5 md:h-7" />}
            label="Settings"
            href="/main/settings"
            active={pathname === "/main/settings"}
          />

         <SidebarItem
            icon={<Star className='h-5 md:h-7'/>}
            label="Reviews"
            href="/main/reviews"
            active={pathname === "/main/reviews"}
          />
          
          <SidebarItem
            icon={<LifeBuoy className="h-5 md:h-7" />}
            label="Support"
            href="/main/support"
            active={pathname === "/main/support"}
          />
        </div>

        <div className="mt-auto flex items-center justify-between w-full pr-2 pt-4 border-t border-border/50">
          <p
            className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg cursor-pointer transition-all duration-300 hover:bg-black/10 text-slate-700 hover:text-slate-900 dark:text-white dark:hover:text-white/70"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="opacity-60" />
            {isLoggedIn ? "Log out" : "Log in"}
          </p>
          <ThemeToggle />
        </div>
      </aside>

      {logoutOpen && (
        <LogoutWarning
          onClose={() => setLogoutOpen(false)}
          onConfirm={handleLogout}
        />
      )}

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onPostCreated={(post: Post) => {
            if (!post || !post._id) return;
            setPosts((prev) => [post, ...prev]);
          }}
        />
      )} 
    </>
  );
}

function SidebarItem({ icon, label, href, active, onClick, unreadCount = 0 }: SidebarItemProps) {
  if (onClick) {
    return (
      <button onClick={onClick} className="flex gap-2 cursor-pointer transition-all duration-200 p-2 rounded-lg w-full md:pl-5 text-slate-700 hover:bg-black/10 hover:text-slate-900 dark:text-white dark:hover:bg-blue-400/20 dark:hover:text-white/70">
        <span className="h-4 md:h-6 text-slate-500 dark:text-white/50">
          {icon}
        </span>
        {label}
      </button>
    );
  }

  return (
    <Link
      href={href!}
      className={`relative flex gap-2 cursor-pointer transition-all duration-200 p-2 rounded-lg w-full md:pl-5 ${active
        ? "bg-blue-500 text-white"
        : "text-slate-700 hover:bg-black/10 hover:text-slate-900 dark:text-white dark:hover:bg-blue-400/20 dark:hover:text-white/70"
        }`}>
      <span className={`h-4 md:h-6 ${active ? "text-white" : "text-slate-500 dark:text-white/50"}`}>
        {icon}
      </span>
      {label}
      {unreadCount > 0 ? (
        <span className="absolute right-3 top-2 h-5 min-w-5 px-1 text-[10px] bg-red-500 text-white rounded-full flex items-center justify-center">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
