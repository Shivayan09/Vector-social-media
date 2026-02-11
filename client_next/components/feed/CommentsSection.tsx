"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function CommentsSection({ postId }: { postId: string }) {
    const { userData } = useAppContext();
    const [comments, setComments] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [buttonLoading, setButtonLoading] = useState(false);

    function timeAgo(dateString: string) {
        const now = new Date().getTime();
        const past = new Date(dateString).getTime();
        const diff = Math.floor((now - past) / 1000);
        if (diff < 60) {
            return `${diff}s ago`;
        }
        if (diff < 3600) {
            return `${Math.floor(diff / 60)}m ago`;
        }
        if (diff < 86400) {
            return `${Math.floor(diff / 3600)}h ago`;
        }
        if (diff < 604800) {
            return `${Math.floor(diff / 86400)}d ago`;
        }
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
            toast.error(error.message)
        } finally {
            setButtonLoading(false);
        }
    }

    if (loading) return <p className="text-sm text-gray-500">Loading comments...</p>;

    return (
        <div className="mt-3 border-t pt-3">
            {userData && (
                <div className="flex gap-2 my-4">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 border rounded-md px-3 h-9 md:h-10 outline-none" />
                    <button disabled={!text.trim() || buttonLoading} onClick={handlePost}
                        className="w-20 md:w-25 h-9 md:h-10 cursor-pointer bg-blue-500 text-white rounded-md disabled:opacity-50">
                        Post
                    </button>
                </div>
            )}
            <div className="flex flex-col gap-5">
                {comments.length == 0 && <p className="text-[0.9rem text-gray-500 py-3">No comments yet!</p>}
                {comments.map((c) => (
                    <div key={c._id} className="flex gap-2">
                        <img src={c.author?.avatar || "/default-avatar.png"} className="h-7 md:h-9 w-7 md:w-9 rounded-full" />
                        <div className="md:flex gap-3 w-full">
                            <div className="flex justify-between">
                                <p className="text-[0.9rem] font-semibold" onClick={() => router.push(`/main/user/${comments[c].author.username}`)}>
                                    {c.author?.name}
                                </p>
                                <p className="md:hidden text-[0.8rem] text-gray-500 ml-auto">{timeAgo(c.createdAt)}</p>
                            </div>
                            <p className="text-[0.9rem]">{c?.content}</p>
                            <p className="text-[0.8rem] hidden md:flex text-gray-500 ml-auto">{timeAgo(c.createdAt)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
