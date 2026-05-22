"use client";

import { useEffect, useState, useRef, use } from "react";
import Image from "next/image";
import axios from "axios";
import { socket } from "@/socket/socket";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { Trash2, ArrowLeft, MoreHorizontal, ChevronDown } from "lucide-react";
import ConfirmModal from "@/components/modals/DeleteWarning";
import SkeletonLoader from "@/components/loaders/SkeletonLoader";
import type { Conversation, Message, UserSummary } from "@/lib/types";

type Params = {
  conversationId: string;
};

export default function ChatPage({ params }: { params: Promise<Params> }) {

  const resolvedParams = use(params);
  const conversationId = resolvedParams.conversationId;

  const { userData } = useAppContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<UserSummary | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  const [warningOpen, setWarningOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

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

    const handleReceiveMessage = (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        if (message.conversation !== conversationId) return prev;
        return [...prev, message];
      });
    };

    const handleDelete = ({
      messageId,
      conversationId: convo,
    }: {
      messageId: string;
      conversationId: string;
    }) => {

      if (convo === conversationId) {

        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? {
                ...m,
                isDeleted: true,
              }
              : m
          )
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

      setIsLoadingMessages(true);
      try {
        const convoRes = await axios.get<Conversation>(
          `${BACKEND_URL}/api/conversation/${conversationId}`,
          { withCredentials: true }
        );

        const participants = convoRes.data.participants;

        const other = participants.find(
          (p: UserSummary) => p._id !== userData?.id
        );

        if (other) {
          setReceiverId(other._id);
          setOtherUser(other);
        }

        const msgRes = await axios.get<Message[]>(
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
        } catch {
          // Silently handle error to not interrupt chat load
        }
      } catch (error) {
        console.error("Failed to fetch chat:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    if (userData?.id) {
      fetchChat();
    }

  }, [BACKEND_URL, conversationId, userData]);

  // AUTO SCROLL
  useEffect(() => {
    const container = chatContainerRef.current;

    if (!container) return;

    const threshold = 100;

    const isNearBottom =
      container.scrollHeight -
        container.scrollTop -
        container.clientHeight <
      threshold;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    const container = chatContainerRef.current;

    if (!container) return;

    const handleScroll = () => {
      const threshold = 100;

      const isNearBottom =
        container.scrollHeight -
          container.scrollTop -
          container.clientHeight <
        threshold;

      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // SEND MESSAGE
  const sendMessage = async () => {

    if (!text.trim() || !receiverId || isSending) return;

    setIsSending(true);

    try {
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
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
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
        prev.map((m) =>
          m._id === selectedMessage._id
            ? {
              ...m,
              isDeleted: true,
            }
            : m
        )
      );

    } catch (err) {

      console.error(err);

    } finally {

      setWarningOpen(false);
      setSelectedMessage(null);

    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="chat-header px-14 md:px-5">
        <button
          onClick={() => router.push("/main/chat")}
          className="rounded-full p-2 transition-colors hover:bg-accent/70"
          title="Back to chat list"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </button>

        <Image alt={otherUser?.name || "User avatar"} src={otherUser?.avatar || "/default-avatar.png"} width={48} height={48} className="h-12 w-12 rounded-full object-cover border ml-3" />

        <div
          onClick={() =>
            router.push(`/main/user/${otherUser?.username}`)
          }
          className="ml-3 min-w-0 cursor-pointer"
        >
          <p className="truncate text-[1.05rem] font-semibold text-foreground">
            {otherUser?.name || "User"}
          </p>
          <p className="truncate text-sm surface-text-muted">
            @{otherUser?.username || "vector"}
          </p>
        </div>
      </div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">

        {isLoadingMessages ? (
          <div className="flex flex-col gap-4 w-full mt-2 px-2">
            <div className="flex justify-start">
              <SkeletonLoader count={1} height="h-10" className="w-3/4 max-w-[220px] [&>div]:!rounded-2xl [&>div]:!rounded-bl-md" />
            </div>
            <div className="flex justify-start">
              <SkeletonLoader count={1} height="h-16" className="w-4/5 max-w-[280px] [&>div]:!rounded-2xl [&>div]:!rounded-bl-md" />
            </div>
            <div className="flex justify-end">
              <SkeletonLoader count={1} height="h-10" className="w-2/3 max-w-[240px] [&>div]:!rounded-2xl [&>div]:!rounded-br-md" />
            </div>
            <div className="flex justify-start">
              <SkeletonLoader count={1} height="h-10" className="w-1/2 max-w-[160px] [&>div]:!rounded-2xl [&>div]:!rounded-bl-md" />
            </div>
            <div className="flex justify-end">
              <SkeletonLoader count={1} height="h-12" className="w-3/4 max-w-[260px] [&>div]:!rounded-2xl [&>div]:!rounded-br-md" />
            </div>
            <div className="flex justify-end">
              <SkeletonLoader count={1} height="h-10" className="w-1/3 max-w-[140px] [&>div]:!rounded-2xl [&>div]:!rounded-br-md" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-state">
            <p className="text-base font-medium text-foreground">No messages yet</p>
            <p className="mt-1 text-sm">Start the conversation with something thoughtful.</p>
          </div>
        ) : (
          messages.map((m, index) => {

            const isMe = m.sender._id === userData?.id;
            const showDateSeparator =
              index === 0 ||
              getDateString(m.createdAt) !== getDateString(messages[index - 1].createdAt);

            return (
              <div key={m._id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-3">
                    <span className="chat-date-pill">
                      {getDateString(m.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex ${isMe ? "justify-end" : "justify-start"
                    }`} >

                  <div
                    className={`${isMe
                      ? "chat-bubble-self"
                      : "chat-bubble-other"
                      }`}
                  >

                    {isMe && !m.isDeleted && (
                      <div className="absolute top-1 right-1">
                        <button
                          className="cursor-pointer opacity-70 hover:opacity-100"
                          onClick={() => setOpenMenuId(openMenuId === m._id ? null : m._id)}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {openMenuId === m._id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 bottom-full mb-1 z-20 min-w-35 rounded-md border bg-background shadow-md">
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-accent"
                                onClick={() => {
                                  setSelectedMessage(m);
                                  setWarningOpen(true);
                                  setOpenMenuId(null);
                                }}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <p
                      className={`whitespace-pre-wrap break-words leading-relaxed ${isMe && !m.isDeleted ? "pr-6" : ""
                        }`}
                    >
                      {m.isDeleted ? (
                        <span className="italic opacity-60">
                          This message was deleted
                        </span>
                      ) : (
                        m.content
                      )}

                      <span className="ml-2 text-[10px] opacity-70 relative top-0.5">
                        {formatTime(m.createdAt)}
                      </span>
                    </p>

                  </div>

                </div>
              </div>
            );
          }))
        }

        <div ref={bottomRef} />
      </div>

      <div className="chat-composer">

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isSending) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isSending}
          className="chat-composer-input"
          placeholder="Type a message..."
        />

        <button
          onClick={sendMessage}
          disabled={isSending}
          className="chat-primary-button"
        >
          {isSending ? "Sending..." : "Send"}
        </button>

      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-6 z-50 rounded-full bg-black p-3 text-white shadow-lg transition hover:scale-105"
        >
          <ChevronDown size={20} />
        </button>
      )}

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
