"use client";

import { useState, useEffect, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Search, Bell, User, Plus, Menu, X, Settings, LogOut, Send } from "lucide-react";
import CreateModal from "../modals/CreatePostModal";
import { toast } from "react-toastify";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import LogoutWarning from "../modals/LogoutWarning";
import Themetoggle from "@/app/theme-toggle";

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
    setOpen(false);
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

  const fetchUnreadCount = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/notifications`, { withCredentials: true });
      const unread = data.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const isMain = pathname === "/main";

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`fixed z-50 md:hidden p-2 rounded-lg ${isMain ? "top-7.5 left-6" : "top-4 left-3"
          }`}
        aria-label="Toggle menu"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6 text-white" />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`fixed md:static top-0 left-0 z-50 h-screen text-white w-50 md:w-55 border-r border-black/5 shadow-lg flex flex-col gap-5 px-2 py-5 font-serif text-[1.1rem] backdrop-blur-3xl transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="flex w-full">
          <div className="flex justify-center ml-3">
            <img
              src={userData?.avatar || "/default-avatar.png"}
              className="h-12 w-12 rounded-full object-cover border shrink-0"
            />

            <div className="flex flex-col ml-3">
              <p className="font-semibold text-[1.1rem]">Hello</p>
              <p className="text-gray-300">{userData?.name}!</p>
            </div>
          </div>
        </div>

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
          className="flex mr-auto pl-2 md:pl-5 gap-2 mt-auto transition-all duration-300 hover:bg-black/10 w-full h-10 rounded-lg items-center cursor-pointer dark:hover:text-white/70"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="opacity-60" />
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
          onPostCreated={(post) => {
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
      <button onClick={onClick} className="flex gap-2 cursor-pointer transition-all duration-200 p-2 rounded-lg w-full md:pl-5 hover:bg-black/10 dark:hover:bg-blue-400/20">
        <span className="h-4 md:h-6 text-stone-300 dark:text-white/50">
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
        : "hover:bg-black/10 dark:hover:bg-blue-400/20 dark:hover:text-white/70"
        }`}>
      <span className={`h-4 md:h-6 ${active ? "text-white" : "text-stone-300 dark:text-white/50"}`}>
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