"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Trash2 } from "lucide-react";
import DeleteWarning from "@/components/modals/DeleteWarning";
import InlineLoader from "../loaders/InlineLoader";

export default function CommentsSection({ postId }: { postId: string }) {
    const { userData } = useAppContext();
    const [comments, setComments] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [buttonLoading, setButtonLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedComment, setSelectedComment] = useState<any>(null);

    function timeAgo(dateString: string) {
        const now = new Date().getTime();
        const past = new Date(dateString).getTime();
        const diff = Math.floor((now - past) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        const fetchComments = async () => {
            const { data } = await axios.get(`${BACKEND_URL}/api/comments/${postId}`, { withCredentials: true });
            setComments(data);
            setLoading(false);
        };
        fetchComments();
    }, [postId]);

    const handlePost = async () => {
        try {
            setButtonLoading(true);
            const { data } = await axios.post(`${BACKEND_URL}/api/comments/${postId}`, { content: text }, { withCredentials: true });
            setComments(prev => [...prev, data]);
            setText("");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setButtonLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (text.trim() && !buttonLoading) {
                handlePost();
            }
        }
    };

    const handleDeleteComment = async () => {
        if (!selectedComment) return;
        try {
            await axios.delete(`${BACKEND_URL}/api/comments/${selectedComment._id}`, { withCredentials: true });
            setComments(prev => prev.filter(c => c._id !== selectedComment._id));
            toast.success("Comment deleted");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setShowDeleteModal(false);
            setSelectedComment(null);
        }
    };

    if (loading) {
        return <div className="py-2"><InlineLoader text="Loading comments..." /></div>;
    }

    return (
        <div className="mt-3 border-t pt-3 px-3 md:px-5 backdrop-blur-3xl rounded-b-xl">
            {userData && (
                <div className="flex gap-2 my-4">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Write a comment... (Shift+Enter for new line)" className="flex-1 bg-white/30 rounded-md px-3 py-2 outline-none resize-none" rows={1} />
                    <button disabled={!text.trim() || buttonLoading} onClick={handlePost} className="w-20 md:w-25 h-9 md:h-10 cursor-pointer bg-blue-500 text-white rounded-md disabled:opacity-50">
                        Post
                    </button>
                </div>
            )}

            <div className="flex flex-col">
                {comments.length === 0 && (
                    <p className="text-[0.9rem] text-gray-300 text-center dark:text-gray-500 py-3">
                        No comments yet!
                    </p>
                )}

                {comments.map((c) => {
                    const isOwner =
                        String(c.author?._id) === String(userData?.id);

                    return (
                        <div key={c._id} className="flex gap-3 py-3 px-2 rounded-lg">
                            <img src={c.author?.avatar || "/default-avatar.png"} className="h-8 w-8 md:h-9 md:w-9 object-cover rounded-full shrink-0"/>

                            <div className="flex flex-col w-full">

                                <div className="flex items-center gap-2">
                                    <p
                                        className="text-[0.9rem] font-semibold text-white cursor-pointer"
                                        onClick={() =>
                                            router.push(`/main/user/${c.author?.username}`)
                                        }
                                    >
                                        {c.author?.name}
                                    </p>

                                    {isOwner && (
                                        <Trash2
                                            size={16}
                                            className="text-white/70 cursor-pointer ml-auto"
                                            onClick={() => {
                                                setSelectedComment(c);
                                                setShowDeleteModal(true);
                                            }}
                                        />
                                    )}
                                </div>

                                <p className="text-[0.9rem] text-gray-300 wrap-break-word">
                                    {c?.content}
                                </p>

                                <p className="text-[0.75rem] text-gray-500 mt-1">
                                    {timeAgo(c.createdAt)}
                                </p>

                            </div>
                        </div>
                    );
                })}
            </div>

            <DeleteWarning
                open={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedComment(null);
                }}
                onConfirm={handleDeleteComment}
                content={selectedComment?.content}
            />
        </div>
    );
}