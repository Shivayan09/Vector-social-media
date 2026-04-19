"use client";

import { useEffect, useState, useRef, use } from "react";
import axios from "axios";
import { socket } from "@/socket/socket";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { Trash2, ArrowLeft } from "lucide-react";
import ConfirmModal from "@/components/modals/DeleteWarning";

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

  const [warningOpen, setWarningOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const router = useRouter();

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDateString = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    
    const isToday = 
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    
    return messageDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  // SOCKET LISTENERS
  useEffect(() => {
    if (!userData?.id) return;

    socket.emit("register", userData.id);

    const handleReceiveMessage = (message: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        if (message.conversation !== conversationId) return prev;
        return [...prev, message];
      });
    };

    const handleDelete = ({ messageId, conversationId: convo }: any) => {
      if (convo === conversationId) {
        setMessages((prev) =>
          prev.filter((m) => m._id !== messageId)
        );
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_deleted", handleDelete);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_deleted", handleDelete);
    };

  }, [userData, conversationId]);

  // FETCH CHAT
  useEffect(() => {

    const fetchChat = async () => {

      const convoRes = await axios.get(
        `${BACKEND_URL}/api/conversation/${conversationId}`,
        { withCredentials: true }
      );

      const participants = convoRes.data.participants;

      const other = participants.find(
        (p: any) => p._id !== userData?.id
      );

      if (other) {
        setReceiverId(other._id);
        setOtherUser(other);
      }

      const msgRes = await axios.get(
        `${BACKEND_URL}/api/messages/${conversationId}`,
        { withCredentials: true }
      );

      setMessages(msgRes.data);

      // Mark all messages as read
      try {
        await axios.patch(
          `${BACKEND_URL}/api/messages/${conversationId}/read-all`,
          {},
          { withCredentials: true }
        );
      } catch (error) {
        // Silently handle error to not interrupt chat load
      }
    };

    if (userData?.id) {
      fetchChat();
    }

  }, [conversationId, userData]);

  // AUTO SCROLL
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SEND MESSAGE
  const sendMessage = async () => {

    if (!text.trim() || !receiverId) return;

    const { data } = await axios.post(
      `${BACKEND_URL}/api/messages`,
      { conversationId, content: text },
      { withCredentials: true }
    );

    setMessages((prev) => {
      if (prev.some((m) => m._id === data._id)) return prev;
      return [...prev, data];
    });

    setText("");
  };

  // DELETE MESSAGE
  const deleteMessage = async () => {

    if (!selectedMessage) return;

    try {

      await axios.delete(
        `${BACKEND_URL}/api/messages/${selectedMessage._id}`,
        { withCredentials: true }
      );

      setMessages((prev) =>
        prev.filter((m) => m._id !== selectedMessage._id)
      );

    } catch (err) {
      console.error(err);
    } finally {
      setWarningOpen(false);
      setSelectedMessage(null);
    }
  };

  return (
    <div className="flex flex-col h-screen">

      <div className="bg-white/15 px-14 md:px-5 py-2 flex items-center">
        <button
          onClick={() => router.push("/main/chat")}
          className="hover:bg-white/20 p-2 rounded-full transition-colors"
          title="Back to chat list"
        >
          <ArrowLeft size={24} className="text-white" />
        </button>

        <img src={otherUser?.avatar || "/default-avatar.png"} className="h-12 w-12 rounded-full object-cover border ml-3"/>

        <p
          onClick={() =>
            router.push(`/main/user/${otherUser?.username}`)
          }
          className="ml-3 cursor-pointer font-semibold text-white text-[1.1rem]">
          {otherUser?.name || "User"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">

        {messages.map((m, index) => {

          const isMe = m.sender._id === userData?.id;
          const showDateSeparator = 
            index === 0 || 
            getDateString(m.createdAt) !== getDateString(messages[index - 1].createdAt);

          return (
            <div key={m._id}>
              {showDateSeparator && (
                <div className="flex justify-center my-3">
                  <span className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
                    {getDateString(m.createdAt)}
                  </span>
                </div>
              )}
              
              <div
                className={`flex ${
                  isMe ? "justify-end" : "justify-start"
                }`} >

                <div
                  className={`max-w-[70%] px-4 py-2 rounded-md relative ${
                    isMe
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >

                  {isMe && (
                    <Trash2
                      size={14}
                      className="absolute -top-2 -right-2 cursor-pointer opacity-70 hover:opacity-100"
                      onClick={() => {
                        setSelectedMessage(m);
                        setWarningOpen(true);
                      }}
                    />
                  )}

                  <p className="whitespace-pre-wrap wrap-break-word">
                    {m.content}
                    <span className="ml-2 text-[10px] opacity-70 relative top-0.5">
                      {formatTime(m.createdAt)}
                    </span>
                  </p>

                </div>

              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <div className="border-t px-7 pb-6 pt-4 flex gap-2 backdrop-blur-3xl">

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          className="flex-1 border px-3 py-2 rounded-md text-white bg-black/10"
          placeholder="Type a message..."
        />

        <button onClick={sendMessage} className="bg-blue-500 text-white px-5 rounded-md cursor-pointer">
          Send
        </button>

      </div>

      <ConfirmModal
        open={warningOpen}
        onClose={() => {
          setWarningOpen(false);
          setSelectedMessage(null);
        }}
        onConfirm={deleteMessage}
        title="Delete this message?"
        description="This message will be permanently deleted."
        confirmText="Delete"
        content={selectedMessage?.content}
      />

    </div>
  );
}