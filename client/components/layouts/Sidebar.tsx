"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Search, Bell, User, Plus, Menu, X, Settings, LogOut, Send } from "lucide-react";
import CreateModal from "../modals/CreatePostModal";
import { toast } from "react-toastify";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import LogoutWarning from "../modals/LogoutWarning";
import Themetoggle from "@/app/theme-toggle";
import type { Notification, Post } from "@/lib/types";

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  unreadCount?: number;
}

export default function Sidebar() {
  const [open, setOpen] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const { isLoggedIn, setIsLoggedIn, setUserData, userData, setPosts } = useAppContext();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setOpen(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const { data } = await axios.post(BACKEND_URL + "/api/auth/logout", {}, { withCredentials: true });
      if (data.success) {
        toast.success("Logged out successfully!");
        setIsLoggedIn(false);
        setUserData(null);
        router.replace("/auth/login");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get<Notification[]>(
        `${BACKEND_URL}/api/notifications`,
        { withCredentials: true }
      );
      const unread = data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch {
      console.error("Failed to fetch notifications");
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchUnreadCount();
    }, 0);
    const interval = window.setInterval(() => {
      void fetchUnreadCount();
    }, 10000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  const isMain = pathname === "/main";

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`glass-surface-strong fixed z-50 rounded-lg p-2 md:hidden ${isMain ? "top-7.5 left-6" : "top-4 left-3"
          }`}
        aria-label="Toggle menu"
      >
        {open ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`sidebar-shell transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <Link href={`/main/user/${userData?.username}`}>
          <div className="flex justify-center ml-3">
            <img
              alt={userData?.name || "User avatar"}
              src={userData?.avatar || "/default-avatar.png"}
              className="h-12 w-12 rounded-full object-cover border shrink-0"
            />

            <div className="flex flex-col ml-3">
              <p className="font-semibold text-[1.1rem]">Hello</p>
              <p className="surface-text-muted">{userData?.name}</p>
            </div>
          </div>
        </Link>

        <div className="w-full flex items-center gap-2 md:pl-5">
          <Themetoggle />
        </div>

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

        <p
          className="sidebar-item mt-auto mr-auto h-10 items-center pl-2 md:pl-5"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="sidebar-icon opacity-60" />
          {isLoggedIn ? "Log out" : "Log in"}
        </p>
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
      <button onClick={onClick} className="sidebar-item">
        <span className="sidebar-icon h-4 md:h-6">
          {icon}
        </span>
        {label}
      </button>
    );
  }

  return (
    <Link
      href={href!}
      className={`${active ? "sidebar-item-active" : "sidebar-item"} ${active
        ? ""
        : ""
        }`}>
      <span className={`h-4 md:h-6 ${active ? "sidebar-icon" : "sidebar-icon"}`}>
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
