"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { ArrowRight, Trash2 } from "lucide-react";
import MessagesSidebar from "@/components/layouts/MessagesSidebar";
import ConfirmModal from "@/components/modals/DeleteWarning";
import { toast } from "react-toastify";

export default function ChatListPage() {

    const { userData } = useAppContext();
    const router = useRouter();

    const [conversations, setConversations] = useState<any[]>([]);
    const [chatToDelete, setChatToDelete] = useState<any>(null);
    const [hasMessages, setHasMessages] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        const fetchConversations = async () => {
            const { data: allConvos } = await axios.get(
                `${BACKEND_URL}/api/conversation`,
                { withCredentials: true }
            );

            // For each conversation, check if it has messages.
            // Run all checks in parallel, then keep only the non-empty ones.
            const results = await Promise.all(
                allConvos.map(async (convo: any) => {
                    const { data: messages } = await axios.get(
                        `${BACKEND_URL}/api/messages/${convo._id}`,
                        { withCredentials: true }
                    );
                    return messages.length > 0 ? convo : null;
                })
            );

            setConversations(results.filter(Boolean));

            // Fetch unread counts for all conversations in parallel
            const nonEmptyConversations = results.filter(Boolean);
            const unreadCountEntries = await Promise.all(
                nonEmptyConversations.map(async (convo: any) => {
                    try {
                        const { data } = await axios.get(
                            `${BACKEND_URL}/api/messages/${convo._id}/unread-count`,
                            { withCredentials: true }
                        );
                        return [convo._id, data.unreadCount] as const;
                    } catch (error) {
                        return [convo._id, 0] as const;
                    }
                })
            );
            const counts = Object.fromEntries(unreadCountEntries) as Record<string, number>;
            setUnreadCounts(counts);
        };

        if (userData?.id) {
            fetchConversations();
        }
    }, [userData]);

    const handleDeleteClick = async (e: React.MouseEvent, convo: any) => {
        e.stopPropagation();
        try {
            const { data } = await axios.get(`${BACKEND_URL}/api/messages/${convo._id}`, { withCredentials: true });
            setHasMessages(data.length > 0);
        } catch {
            setHasMessages(false);
        }
        setChatToDelete(convo);
    };

    const confirmDeleteChat = async () => {
        if (!chatToDelete) return;
        try {
            await axios.delete(`${BACKEND_URL}/api/conversation/${chatToDelete._id}`, { withCredentials: true });
            setConversations((prev) => prev.filter((c: any) => c._id !== chatToDelete._id));
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

            <h1 className="text-xl font-bold p-4 bg-white/15 dark:bg-black/25 text-white text-center md:text-left">
                Your chats
            </h1>

            <div className="flex flex-col p-5 gap-2">
                {conversations.map((convo) => {

                    const otherUser = convo.participants.find(
                        (p: any) => p._id !== userData?.id
                    );

                    return (
                        <div key={convo._id} onClick={() => router.push(`/main/chat/${convo._id}`)}
                            className="flex items-center gap-3 p-4 rounded-lg cursor-pointer bg-black/10 hover:bg-black/15 hover:shadow-lg text-white transition-all duration-200">

                            <img src={otherUser?.avatar || "/default-avatar.png"} className="h-12 w-12 rounded-full object-cover"/>

                            <div>
                                <p className="font-semibold">
                                    {otherUser?.name}
                                </p>

                                <p className="text-sm text-gray-500">
                                    @{otherUser?.username}
                                </p>
                            </div>
                            {unreadCounts[convo._id] > 0 && (
                                <div className="ml-auto mr-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                    {unreadCounts[convo._id]}
                                </div>
                            )}
                            <ArrowRight className="ml-auto opacity-70"/>
                            <Trash2
                                onClick={(e) => handleDeleteClick(e, convo)}
                                className="ml-2 text-red-500 opacity-70 hover:opacity-100 hover:scale-110 transition-transform"
                                size={20}
                            />
                        </div>
                    );
                })}
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

        <MessagesSidebar/>
        </div>
    );
}