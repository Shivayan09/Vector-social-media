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

    // ✅ conversations
    const [conversations, setConversations] = useState<any[]>([]);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const { userData } = useAppContext();
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const router = useRouter();

    // 🔥 Fetch users
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

    // 🔥 Fetch conversations (FIXED VERSION)
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const { data } = await axios.get(
                    `${BACKEND_URL}/api/conversation`,
                    { withCredentials: true }
                );

                // 🔥 NO extra message fetch
                const sorted = data.sort(
                    (a: any, b: any) =>
                        new Date(b.updatedAt).getTime() -
                        new Date(a.updatedAt).getTime()
                );

                setConversations(sorted);
            } catch (err) {
                console.error("Failed to fetch conversations:", err);
            }
        };

        if (userData?.id) fetchConversations();
    }, [BACKEND_URL, userData]);

    // 🔍 Search users
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

    // Close sidebar on outside click
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

    const filteredUsers = users.filter((u) => {
        if (u._id === userData?.id) return false;
        return userData?.following?.includes(u._id);
    });

    const startChat = async (receiverId: string) => {
        try {
            const { data } = await axios.post(
                `${BACKEND_URL}/api/conversation`,
                { receiverId },
                { withCredentials: true }
            );
            router.push(`/main/chat/${data._id}`);
        } catch (error) {
            console.error("Failed to start chat", error);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="fixed top-4 right-4 z-50 lg:hidden p-2 rounded-full bg-blue-500 text-white shadow-lg"
            >
                <UserPlus />
            </button>

            {open && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            <div
                ref={wrapperRef}
                className={`h-screen md:min-h-screen md:h-fit w-fit px-7 p-5 backdrop-blur-xl fixed lg:static top-0 right-0 z-50 transform transition-transform duration-300 ${
                    open ? "translate-x-0" : "translate-x-full"
                } lg:translate-x-0`}
            >
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-4 right-4 lg:hidden"
                >
                    <X />
                </button>

                {/* ✅ CHAT LIST */}
                <p className="text-[1.1rem] font-semibold text-white mb-3">
                    Chats
                </p>

                <div className="flex flex-col gap-2 mb-5">
                    {conversations.length === 0 ? (
                        <p className="text-sm opacity-50">No chats yet</p>
                    ) : (
                        conversations.map((convo) => {
                            const otherUser = convo.participants.find(
                                (p: any) => p._id !== userData?.id
                            );

                            return (
                                <div
                                    key={convo._id}
                                    onClick={() =>
                                        router.push(`/main/chat/${convo._id}`)
                                    }
                                    className="flex items-center gap-2 p-2 rounded-md hover:bg-black/10 cursor-pointer"
                                >
                                    <img
                                        src={
                                            otherUser?.avatar ||
                                            "/default-avatar.png"
                                        }
                                        className="h-10 w-10 rounded-full"
                                    />

                                    <div className="flex flex-col">
                                        <p className="text-sm text-white">
                                            {otherUser?.name}
                                        </p>

                                        {/* ✅ FIXED TEXT */}
                                        <p className="text-xs text-gray-400 truncate w-32">
                                            {convo.updatedAt
                                                ? "Message sent"
                                                : "No messages yet"}
                                        </p>
                                    </div>

                                    {/* ✅ FIXED TIME */}
                                    <p className="text-xs text-gray-400 ml-auto">
                                        {convo.updatedAt
                                            ? new Date(
                                                  convo.updatedAt
                                              ).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                              })
                                            : ""}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Suggestions */}
                <p className="text-[1.1rem] font-semibold text-white mb-2">
                    Suggestions
                </p>

                <div className="mt-4 flex items-center gap-2 bg-white/10 px-3 py-2 rounded-md">
                    <Search className="h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-transparent outline-none text-sm text-white w-full"
                    />
                </div>

                <div className="mt-5 flex flex-col gap-2">
                    {filteredUsers.map((u) => (
                        <div
                            key={u._id}
                            onClick={() => startChat(u._id)}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <img
                                src={u.avatar || "/default-avatar.png"}
                                className="h-10 w-10 rounded-full"
                            />
                            <p className="text-white">{u.name}</p>
                            <Send className="ml-auto opacity-60" />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}