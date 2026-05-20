"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { ArrowRight, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/modals/DeleteWarning";
import { toast } from "react-toastify";
import SkeletonLoader from "@/components/loaders/SkeletonLoader";
import type { Conversation, UserSummary } from "@/lib/types";

export default function ChatListPage() {
    const { userData } = useAppContext();
    const router = useRouter();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [allUserResults, setAllUserResults] = useState<UserSummary[]>([]);
    const [chatToDelete, setChatToDelete] = useState<Conversation | null>(null);
    const [hasMessages, setHasMessages] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                setLoading(true);
                const { data: validConvos } = await axios.get(
                    `${BACKEND_URL}/api/conversation`,
                    { withCredentials: true }
                );

                setConversations(validConvos);

                // Extract unread counts from response (already aggregated in backend)
                const counts: Record<string, number> = {};
                validConvos.forEach((convo: Conversation) => {
                    counts[convo._id] = convo.unreadCount || 0;
                });

                setUnreadCounts(counts);
                setFilteredConversations(validConvos);
            } catch (error) {
                console.error("Failed to fetch conversations:", error);
                setConversations([]);
                setFilteredConversations([]);
                setUnreadCounts({});
            } finally {
                setLoading(false);
            }
        };

        if (userData?.id) void fetchConversations();
    }, [BACKEND_URL, userData]);

    useEffect(() => {
        const filtered = conversations.filter((convo) => {
            const otherUser = convo.participants.find(
                (p: UserSummary) => p._id !== userData?.id
            );

            return (
                otherUser?.name
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                otherUser?.username
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase())
            );
        });

        setFilteredConversations(filtered);
    }, [searchTerm, conversations, userData]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setAllUserResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            try {
                const { data } = await axios.get(
                    `${BACKEND_URL}/api/users/search?query=${encodeURIComponent(searchTerm)}`,
                    { withCredentials: true }
                );
                const existingParticipantIds = new Set(
                    conversations.flatMap((c) =>
                        c.participants.map((p: UserSummary) => p._id)
                    )
                );
                const newUsers = (data.users as UserSummary[]).filter(
                    (u) => u._id !== userData?.id && !existingParticipantIds.has(u._id)
                );
                setAllUserResults(newUsers);
            } catch {
                setAllUserResults([]);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchTerm, BACKEND_URL, conversations, userData]);

    const handleNewUserClick = async (user: UserSummary) => {
        try {
            const { data } = await axios.post(
                `${BACKEND_URL}/api/conversation`,
                { receiverId: user._id },
                { withCredentials: true }
            );
            router.push(`/main/chat/${data._id}`);
        } catch (error) {
            console.error("Failed to open chat", error);
        }
    };

    const handleDeleteClick = async (
        e: React.MouseEvent,
        convo: Conversation
    ) => {
        e.stopPropagation();

        try {
            const { data } = await axios.get(
                `${BACKEND_URL}/api/messages/${convo._id}`,
                { withCredentials: true }
            );
            setHasMessages(data.length > 0);
        } catch {
            setHasMessages(false);
        }

        setChatToDelete(convo);
    };

    const confirmDeleteChat = async () => {
        if (!chatToDelete) return;

        try {
            await axios.delete(
                `${BACKEND_URL}/api/conversation/${chatToDelete._id}`,
                { withCredentials: true }
            );

            setConversations((prev) =>
                prev.filter((c) => c._id !== chatToDelete._id)
            );

            setFilteredConversations((prev) =>
                prev.filter((c) => c._id !== chatToDelete._id)
            );

            toast.success("Chat deleted successfully");
        } catch (error) {
            console.error("Failed to delete chat", error);
        } finally {
            setChatToDelete(null);
        }
    };

    return (
        <div className="chat-page-shell flex h-screen w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto hide-scrollbar">
                <div className="chat-list-shell">
                    <div className="mb-5">
                        <h1 className="chat-list-title text-center md:text-left">
                            Your chats
                        </h1>
                        <p className="chat-list-subtitle text-center md:text-left">
                            Quiet, focused conversations that feel like part of Vector.
                        </p>
                    </div>

                    <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="chat-search-input"
                    />
                    </div>

                <div className="flex flex-col gap-3">
                    {loading ? (
                        <SkeletonLoader count={5} height="h-16" />
                    ) : filteredConversations.length > 0 ? (
                        filteredConversations.map((convo) => {
                            const otherUser = convo.participants.find(
                                (p: UserSummary) => p._id !== userData?.id
                            );

                            return (
                                <div
                                    key={convo._id}
                                    onClick={() =>
                                        router.push(`/main/chat/${convo._id}`)
                                    }
                                    className="chat-list-item group cursor-pointer"
                                >
                                    <Image
                                        alt={otherUser?.name || "Chat user"}
                                        src={
                                            otherUser?.avatar ||
                                            "/default-avatar.png"
                                        }
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 rounded-full object-cover ring-2 ring-background/70"
                                    />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <p className="truncate font-semibold text-foreground">
                                                {otherUser?.name}
                                            </p>
                                            {convo.lastMessage && (
                                                <span className="chat-list-meta ml-2">
                                                    {new Date(convo.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="surface-text-muted truncate pr-2 text-sm">
                                                {convo.lastMessage?.content || `@${otherUser?.username}`}
                                            </p>
                                            {unreadCounts[convo._id] > 0 && (
                                                <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                                                    {unreadCounts[convo._id]}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Trash2
                                        onClick={(e) =>
                                            handleDeleteClick(e, convo)
                                        }
                                        className="ml-2 text-foreground/35 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110 hover:text-red-500"
                                        size={20}
                                    />

                                    <ArrowRight className="ml-1 text-foreground/35 transition-transform duration-200 group-hover:translate-x-1" />
                                </div>
                            );
                        })
                    ) : (
                        <p className="chat-empty-state">No conversations found.</p>
                    )}
                    {allUserResults.length > 0 && (
                        <>
                            <p className="chat-list-meta px-1 pt-3">Other users</p>
                            {allUserResults.map((user) => (
                                <div
                                    key={user._id}
                                    onClick={() => handleNewUserClick(user)}
                                    className="chat-other-user-card cursor-pointer"
                                >
                                    <Image
                                        alt={user.name || "User"}
                                        src={user.avatar || "/default-avatar.png"}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 rounded-full object-cover ring-2 ring-background/70"
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-foreground">{user.name}</p>
                                        <p className="truncate text-sm surface-text-muted">@{user.username}</p>
                                    </div>
                                    <ArrowRight className="ml-auto opacity-60 text-foreground" />
                                </div>
                            ))}
                        </>
                    )}
                </div>
                </div>
            </div>

            <ConfirmModal
                open={!!chatToDelete}
                onClose={() => setChatToDelete(null)}
                onConfirm={confirmDeleteChat}
                title="Delete this chat?"
                description={
                    hasMessages
                        ? "Are you sure you want to delete this chat? All the chats till now would be deleted"
                        : "Are you sure you want to delete this chat?"
                }
                confirmText="Delete"
            />
        </div>
    );
}
