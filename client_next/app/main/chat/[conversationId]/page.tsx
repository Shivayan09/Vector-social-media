"use client";

import { useEffect, useState, use } from "react";
import axios from "axios";
import { socket } from "@/socket/socket";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";

type Params = {
  conversationId: string;
};

export default function ChatPage({ params }: { params: Promise<Params> }) {

  const resolvedParams = use(params);
  const conversationId = resolvedParams.conversationId;

  const { userData } = useAppContext();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const router = useRouter();

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // register socket
  useEffect(() => {

    if (!userData?.id) return;

    socket.emit("register", userData.id);

    socket.on("receive_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("receive_message");
    };

  }, [userData]);

  useEffect(() => {
    const fetchChat = async () => {
      const convoRes = await axios.get(`${BACKEND_URL}/api/conversation/${conversationId}`, { withCredentials: true });
      const participants = convoRes.data.participants;
      const other = participants.find(
        (p: any) => p._id !== userData?.id
      );
      if (other) {
        setReceiverId(other._id);
        setOtherUser(other);
      }
      const msgRes = await axios.get(`${BACKEND_URL}/api/messages/${conversationId}`, { withCredentials: true });
      setMessages(msgRes.data);
    };

    if (userData?.id) {
      fetchChat();
    }

  }, [conversationId, userData]);

  const sendMessage = async () => {
    if (!text.trim() || !receiverId) return;
    const { data } = await axios.post(`${BACKEND_URL}/api/messages`, { conversationId, content: text }, { withCredentials: true });
    setMessages((prev) => [...prev, data]);
    socket.emit("send_message", { ...data, receiverId, });
    setText("");
  };

  return (
    <div className="flex flex-col h-screen">

      <div className="bg-white/15 px-5 py-2 flex items-center">

        <img src={otherUser?.avatar || "/default-avatar.png"} className="h-12 w-12 rounded-full object-cover border" />

        <p onClick={() => router.push(`/main/user/${otherUser?.username}`)} className="ml-3 font-semibold text-white text-[1.1rem]">
          {otherUser?.name || "User"}
        </p>

      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">

        {messages.map((m) => {

          const isMe = m.sender._id === userData?.id;

          return (
            <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>

              <div className={` max-w-[70%] px-4 py-2 rounded-md text-sm flex flex-col ${isMe ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}`}>

                <p>{m.content}</p>

                <span className="text-[11px] opacity-70 self-end mt-1">
                  {formatTime(m.createdAt)}
                </span>

              </div>

            </div>
          );
        })}

      </div>

      <div className="border-t px-7 pb-6 pt-4 flex gap-2">

        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          className="flex-1 border px-3 py-2 rounded-md text-white" placeholder="Type a message..." />

        <button onClick={sendMessage} className="bg-blue-500 text-white px-5 rounded-md cursor-pointer">
          Send
        </button>

      </div>

    </div>
  );
}