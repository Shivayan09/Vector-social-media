"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { ArrowRight, ChartArea, MessageSquare, Send } from "lucide-react";
import MessagesSidebar from "@/components/layouts/MessagesSidebar";

export default function ChatListPage() {

    const { userData } = useAppContext();
    const router = useRouter();

    const [conversations, setConversations] = useState<any[]>([]);

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
        };

        if (userData?.id) {
            fetchConversations();
        }
    }, [userData]);

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
                            <ArrowRight className="ml-auto opacity-70"/>
                        </div>
                    );
                })}
            </div>

        </div>
        <MessagesSidebar/>
        </div>
    );
}