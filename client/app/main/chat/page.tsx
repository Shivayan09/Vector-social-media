"use client";

import { useEffect, useState } from "react";
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
    const [chatToDelete, setChatToDelete] = useState<Conversation | null>(null);
    const [hasMessages, setHasMessages] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                setLoading(true);
                const { data: allConvos } = await axios.get(
                `${BACKEND_URL}/api/conversation`,
                { withCredentials: true }
            );

            const results = await Promise.all(
                allConvos.map(async (convo: Conversation) => {
                    const { data: messages } = await axios.get(
                        `${BACKEND_URL}/api/messages/${convo._id}`,
                        { withCredentials: true }
                    );
                    return messages.length > 0 ? convo : null;
                })
            );

            const validConvos = results.filter(Boolean);

            setConversations(validConvos);

            const unreadCountEntries = await Promise.all(
                validConvos.map(async (convo: Conversation) => {
                    try {
                        const { data } = await axios.get(
                            `${BACKEND_URL}/api/messages/${convo._id}/unread-count`,
                            { withCredentials: true }
                        );
                        return [convo._id, data.unreadCount] as const;
                    } catch {
                        return [convo._id, 0] as const;
                    }
                })
            );

            const counts = Object.fromEntries(unreadCountEntries) as Record<string, number>;
            setUnreadCounts(counts);
            setFilteredConversations(validConvos);
            } catch {
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
        <div className="flex w-full h-screen">
            <div className="flex-1 h-screen overflow-y-auto hide-scrollbar">


                <h1 className="px-5 pt-3 text-xl font-bold text-foreground">
                    Your chats
                </h1>
                <div className="p-5 pb-0">
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="chat-search-input"
                    />
                </div>
                <div className="flex flex-col p-5 gap-2">
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
                                    className="flex items-center gap-3 p-4 rounded-lg cursor-pointer bg-black/10 dark:bg-white/5 hover:bg-black/15 hover:shadow-lg text-white transition-all duration-200"
                                >
                                    <img
                                        alt={otherUser?.name || "Chat user"}
                                        src={
                                            otherUser?.avatar ||
                                            "/default-avatar.png"
                                        }
                                        className="h-12 w-12 rounded-full object-cover"
                                    />

                                    <div>
                                        <p className="font-semibold">
                                            {otherUser?.name}
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            @{otherUser?.username}
                                        </p>
                                    </div>

                                    <div className="w-full">
                                        {unreadCounts[convo._id] > 0 && (
                                        <div className="ml-auto w-6 mr-2 bg-red-500 text-white rounded-full h-6 flex items-center justify-center text-xs font-bold">
                                            {unreadCounts[convo._id]}
                                        </div>
                                    )}
                                </div>

                                <ArrowRight className="ml-auto opacity-70 text-foreground" />

                                    <Trash2
                                        onClick={(e) =>
                                            handleDeleteClick(e, convo)
                                        }
                                        className="ml-2 text-red-500 opacity-70 hover:opacity-100 hover:scale-110 transition-transform"
                                        size={20}
                                    />
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-gray-500 px-5">No conversations found.</p>
                    )}
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
