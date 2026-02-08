"use client";

import { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Search, Bell, User, Plus, Menu, X, Settings, LogOut, } from "lucide-react";
import Themetoggle from "@/app/theme-toggle";
import CreateModal from "../modals/CreateModal";
import { toast } from "react-toastify";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import LogoutWarning from "../modals/LogoutWarning";
import { useRouter } from "next/navigation";

interface SidebarItemProps {
    icon: ReactNode;
    label: string;
    href?: string;
    active?: boolean;
    onClick?: () => void;
}

export default function Sidebar(): JSX.Element {
    const [open, setOpen] = useState<boolean>(false);
    const [createOpen, setCreateOpen] = useState<boolean>(false);
    const pathname = usePathname();

    const router = useRouter();

    const [logoutOpen, setLogoutOpen] = useState(false);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const { isLoggedIn, setIsLoggedIn, setUserData, userData, setPosts } = useAppContext();

    const handleLogout = async () => {
        try {
            const { data } = await axios.post(BACKEND_URL + '/api/auth/logout')
            if (data.success) {
                toast.success("Logged out successfully!");
                setIsLoggedIn(false);
                setUserData(null);
                router.replace('/auth/login')
                return;
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Something went wrong");
            }
        }
    }

    return (
        <>
            <button onClick={() => setOpen(prev => !prev)} className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg dark:bg-black" aria-label="Toggle menu">
                {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />
            )}

            <aside className={`fixed md:static top-0 left-0 z-50 h-screen w-45 md:w-55 border-r border-black/5 shadow-lg flex flex-col justify-start items-center gap-5 px-2 py-8 font-serif text-[1.1rem] bg-white dark:bg-black transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
                <div className="flex w-full ml-5 mb-5 md:mb-0">
                    <div className="flex flex-col justify-center ml-3">
                        <p className="font-semibold text-[1.1rem]">Hello there</p>
                        <p className="text-[0.9rem] font-light opacity-50">{userData?.name}</p>
                    </div>
                </div>

                <div className="w-full flex items-center gap-2 md:pl-5 my-2">
                    <Themetoggle />
                    <p className="mt-1">Theme</p>
                </div>

                <SidebarItem icon={<Home className="h-5 md:h-7" />} label="Home" href="/main" active={pathname === "/main"} />
                <SidebarItem icon={<Search className="h-5 md:h-7" />} label="Explore" href="/main/explore" active={pathname === "/main/explore"} />

                <SidebarItem icon={<Plus className="h-5 md:h-7" />} label="Create" onClick={() => setCreateOpen(true)} />

                <SidebarItem icon={<Bell className="h-5 md:h-7" />} label="Activity" href="/main/activity" active={pathname === "/main/activity"} />
                <SidebarItem icon={<User className="h-5 md:h-7" />} label="Profile" href="/main/profile" active={pathname === "/main/profile"} />
                <SidebarItem icon={<Settings className="h-5 md:h-7" />} label="Settings" href="/main/settings" active={pathname === "/main/settings"} />

                <p className="flex mr-auto pl-2 md:pl-7 gap-2 mt-auto transition-all duration-300 hover:bg-gray-200 dark:hover:bg-white/10 w-full h-10 rounded-lg items-center cursor-pointer dark:hover:text-white/70"
                    onClick={() => setLogoutOpen(true)}>
                    <LogOut className="opacity-60" /> {isLoggedIn ? "Log out" : "Log in"}
                </p>

            </aside>

            {logoutOpen && (<LogoutWarning onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />)}

            {createOpen && (
                <CreateModal onClose={() => setCreateOpen(false)}
                    onPostCreated={(post) => {
                        if (!post || !post._id) return;
                        setPosts(prev => [post, ...prev]);
                    }} />
            )}


        </>
    );
}

function SidebarItem({ icon, label, href, active, onClick }: SidebarItemProps): JSX.Element {
    if (onClick) {
        return (
            <button onClick={onClick} className={`flex gap-2 cursor-pointer transition-all duration-200 p-2 rounded-lg w-full md:pl-7 hover:bg-blue-400/20 dark:hover:bg-blue-400/20`}>
                <span className="h-4 md:h-6 text-black/50 dark:text-white/50">
                    {icon}
                </span>
                {label}
            </button>
        );
    }

    return (
        <Link href={href!} className={`flex gap-2 cursor-pointer transition-all duration-200 p-2 rounded-lg w-full md:pl-7 ${active ? "bg-blue-500 text-white" : "hover:text-gray-600 hover:bg-blue-400/20 dark:hover:bg-blue-400/20 dark:hover:text-white/70"}`}>
            <span className={`h-4 md:h-6 ${active ? "text-white" : "text-black/50 dark:text-white/50"}`}>
                {icon}
            </span>
            {label}
        </Link>
    );
}