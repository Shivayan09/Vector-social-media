"use client";

import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import { Bookmark, Heart, MessageCircle, Repeat, HelpCircle, Hammer, Share2, MessagesSquare, MoreHorizontal, Trash2, Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import DeleteWarning from "../modals/DeleteWarning";
import ReportPost from "../modals/ReportPost";
import { useRouter } from "next/navigation";
import CommentsSection from "./CommentsSection";

type PostCardProps = {
    post: any;
    setPost?: React.Dispatch<React.SetStateAction<any>>;
};

const intentIconMap: Record<string, any> = {
    ask: HelpCircle,
    build: Hammer,
    share: Share2,
    discuss: MessagesSquare,
    reflect: Bookmark,
};

export default function PostCard({ post, setPost }: PostCardProps) {

    const router = useRouter();
    const { userData, posts, setPosts } = useAppContext();
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const isOwner = userData?.id === post.author._id;
    const isLiked = post.likes?.map(String).includes(String(userData?.id));
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [likeAnimating, setLikeAnimating] = useState(false);

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

    const openPost = () => {
        router.push(`/main/post/${post._id}`);
    };

    const openUserProfile = () => {
        router.push(`/main/user/${post.author.username}`)
    }

    const handleLike = async () => {
        try {
            if (!isLiked) {
                setLikeAnimating(true);
                setTimeout(() => setLikeAnimating(false), 300);
            }
            const updatedLikes = isLiked
                ? post.likes.filter((id: string) => String(id) !== String(userData?.id))
                : [...post.likes, userData?.id];
            if (setPost) {
                setPost((prev: any) => ({
                    ...prev,
                    likes: updatedLikes,
                }));
            }
            else {
                setPosts(prev =>
                    prev.map(p =>
                        p._id === post._id
                            ? { ...p, likes: updatedLikes }
                            : p
                    )
                );
            }
            await axios.put(`${BACKEND_URL}/api/posts/${post._id}/like`, {}, { withCredentials: true });
        } catch {
            toast.error("Failed to like post");
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`${BACKEND_URL}/api/posts/${post._id}`, { withCredentials: true });
            setPosts(prevPosts => prevPosts.filter(p => p._id !== post._id));
            setMenuOpen(false);
            toast.success("Post deleted");
        } catch {
            toast.error("Failed to delete post");
        }
    };

    const handleReport = async () => { }

    useEffect(() => {
        if (!menuOpen) {
            return;
        }
        const handleOutsideClick = (e: MouseEvent) => {
            if (menuRef.current &&!menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [menuOpen]);

    return (
        <div className="border overflow-clip relative border-black/10 dark:border-white/10 bg-white dark:bg-black cursor-pointer hover:bg-black/2 dark:hover:bg-white/1 px-5 py-3 rounded-2xl transition"
            onClick={openPost}>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <div className="h-8 md:h-12 w-8 md:w-12 rounded-full transition-all duration-200" onClick={(e) => { e.stopPropagation(); openUserProfile(); }}>
                        <img src={post.author.avatar || "/default-avatar.png"} className="h-full w-full rounded-full object-cover" />
                    </div>
                    <span className="font-semibold ml-1 transition-all duration-200 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); openUserProfile(); }}>{post.author.name}</span>
                    <span className="text-[0.9rem] text-gray-500 transition-all duration-200 hover:text-gray-700" onClick={(e) => { e.stopPropagation(); openUserProfile(); }}>
                        @{post.author.username}
                    </span>
                    <p className="absolute left-195 text-[0.9rem] font-semibold text-blue-500 flex items-center gap-1.5">
                        Intent:
                        {(() => {
                            const Icon = intentIconMap[post.intent];
                            return Icon ? <Icon size={16} className="text-blue-500 mt-0.5" /> : null;
                        })()}
                        <span className="capitalize">{post.intent}</span>
                    </p>
                </div>

                <div ref={menuRef} className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                        <MoreHorizontal size={20} className="text-gray-400 cursor-pointer mt-0.5" />
                    </button>

                    {menuOpen && (
                        <div className="absolute overflow-clip top-0 right-0 w-30 bg-white dark:bg-black border border-black/10 dark:border-white/20 rounded-md shadow-lg z-50">
                            <button className="w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-blue-500 transition-all duration-300 hover:bg-black/3 dark:hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                                <Share2 size={14} />
                                Share post
                            </button>
                            {isOwner && (
                                <button className="w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-black/3 dark:hover:bg-white/5"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(false);
                                        setShowDeleteModal(true);
                                    }}>
                                    <Trash2 size={14} />
                                    Delete post
                                </button>
                            )}
                            {!isOwner && (
                                <button className="w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-black/3 dark:hover:bg-white/5"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(false);
                                        setShowReportModal(true);
                                    }}>
                                    <Flag size={14} />
                                    Report post
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <p className="mt-2 mb-5 p-1 text-[0.9rem] md:text-[1.1rem]">
                {post.content}
            </p>

            <div className="flex justify-between text-gray-500">
                <div className="flex items-center justify-between w-2/3">
                    <p className="flex gap-1 items-center cursor-pointer hover:text-blue-500">
                        <MessageCircle className="h-4.5 md:h-5 hover:text-blue-500" />
                        {post.commentsCount || 0}
                    </p>

                    <p className="flex gap-1 items-center">
                        <Repeat className="h-4.5 md:h-5 hover:text-blue-500" />0
                    </p>
                    <p className="flex gap-1 items-center" onClick={(e) => { e.stopPropagation(); handleLike() }}>
                        <Heart className={`h-4.5 md:h-5 cursor-pointer transition-transform duration-300 hover:text-blue-500 ${isLiked ? "text-blue-500" : ""} ${likeAnimating ? "scale-135" : "scale-100"}`} fill={isLiked ? "currentColor" : "none"} />
                        {post.likes.length}
                    </p>
                </div>
                <div>
                    <p className="text-[0.85rem]">{timeAgo(post.createdAt)}</p>
                </div>
            </div>

            <DeleteWarning
                open={showDeleteModal}
                content={post.content}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={() => {
                    handleDelete();
                    setShowDeleteModal(false);
                }} />

            <ReportPost
                open={showReportModal}
                onClose={() => setShowReportModal(false)}
                onSubmit={handleReport}
            />
        </div>
    );
}