"use client";

import { Search, Send, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";

type SuggestedUser = {
    _id: string;
    name: string;
    username: string;
    bio?: string;
    avatar?: string;
};

type User = {
    _id: string;
    name: string;
    username?: string;
    avatar?: string;
};

export default function MessagesSidebar() {
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { userData } = useAppContext();
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const router = useRouter();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/users/all`, { withCredentials: true });
                setUsers(res.data.users);
            } catch (err) {
                console.error("Failed to fetch users:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [BACKEND_URL]);

    useEffect(() => {
        const delay = setTimeout(async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }
            try {
                setSearching(true);
                const res = await axios.get(`${BACKEND_URL}/api/users/search?query=${query}`, { withCredentials: true });
                setResults(res.data.users);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setSearching(false);
            }
        }, 400);
        return () => clearTimeout(delay);
    }, [query, BACKEND_URL]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredUsers = users.filter((suggestedUser) => {
        if (suggestedUser._id === userData?.id) {
            return false;
        }
        return userData?.following?.includes(suggestedUser._id);
    });

    const handleClick = (username?: string) => {
        if (!username) {
            return;
        }
        router.push(`/main/user/${username}`);
    };

    const startChat = async (receiverId: string) => {
        try {
            const { data } = await axios.post(`${BACKEND_URL}/api/conversation`, { receiverId }, { withCredentials: true });
            router.push(`/main/chat/${data._id}`);
        } catch (error) {
            console.error("Failed to start chat", error);
        }
    };

    return (
        <>
            <button onClick={() => setOpen(true)} className="fixed top-4 right-4 z-50 lg:hidden p-2 rounded-full bg-blue-500 text-white shadow-lg">
                <UserPlus />
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />
            )}

            <div ref={wrapperRef} className={`h-screen md:min-h-screen md:h-fit w-fit px-7 p-5 backdrop-blur-xl fixed lg:static top-0 right-0 z-50 transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"} lg:translate-x-0`}>
                <button onClick={() => setOpen(false)} className="absolute top-4 right-4 lg:hidden">
                    <X />
                </button>

                <p className="text-[1.1rem] font-semibold flex items-center gap-2 text-white">
                    <UserPlus className="h-5 text-blue-500" />
                    Suggestions
                </p>
                <div className="mt-4 flex items-center gap-2 bg-white/10 px-3 py-2 rounded-md">
                    <Search className="h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-transparent outline-none text-sm text-white placeholder-gray-400 w-full"
                    />
                </div>

                <div className="mt-5 flex flex-col gap-2 w-fit min-h-[75vh] max-h-[60vh] overflow-y-auto hide-scrollbar pr-1">
                    {loading ? (
                        <p className="text-sm opacity-50">Loading users...</p>
                    ) : query.trim() ? (
                        searching ? (
                            <p className="text-sm opacity-50">Searching...</p>
                        ) : results.length === 0 ? (
                            <p className="text-sm opacity-50">No users found.</p>
                        ) : (
                            results.filter((user) => user._id !== userData?.id).map((user) => {
                                return (
                                    <div key={user._id} className="flex items-center gap-2">
                                        <div className="h-12 w-12 rounded-full overflow-hidden">
                                            <img src={user.avatar || "/default-avatar.png"} alt={user.name} className="h-full w-full object-cover" />
                                        </div>
                                        <div className="flex flex-col w-30">
                                            <p className="text-[0.9rem] truncate">{user.name}</p>
                                            <p className="opacity-50 text-[0.8rem] truncate">
                                                @{user.username}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-sm opacity-50">No users found.</p>
                    ) : (
                        filteredUsers.map((suggestedUser) => {
                            return (
                                <div onClick={() => startChat(suggestedUser._id)} key={suggestedUser._id} className="flex items-center gap-2 hover:bg-black/10 cursor-pointer p-3 rounded-md">
                                    <div className="h-10 w-10 rounded-full overflow-hidden">
                                        <img src={suggestedUser.avatar || "/default-avatar.png"} alt={suggestedUser.name} className="h-full w-full object-cover" />
                                    </div>

                                    <div className="flex flex-col w-30">
                                        <p className="text-[0.9rem] text-white truncate cursor-pointer w-fit hover:text-blue-600" onClick={(e) => { e.stopPropagation(); handleClick(suggestedUser.username) }}>
                                            {suggestedUser.name}
                                        </p>
                                        <p className="opacity-50 text-[0.8rem] truncate">
                                            {suggestedUser.bio || "No bio available"}
                                        </p>
                                    </div>

                                    <button onClick={() => startChat(suggestedUser._id)} className="mt-1 cursor-pointer">
                                        <Send className="text-white opacity-60" />
                                    </button>
                                </div>
                            );
                        })
                    )}

                </div>

                <p className="text-gray-400 text-[0.8rem] text-center mt-5">
                    All rights reserved @Vector 2026
                </p>
            </div>
        </>
    );
}
