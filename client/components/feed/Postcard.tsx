"use client";

import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import { Bookmark, Heart, MessageCircle, HelpCircle, Hammer, Share2, MessagesSquare, MoreHorizontal, Trash2, Flag, Forward } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import PostDelete from "../modals/DeleteWarning";
import ReportPost from "../modals/ReportPost";
import LikesModal from "../modals/LikesModal";
import { useRouter } from "next/navigation";
import type { Post, ReportReason } from "@/lib/types";
import { reportPost } from "@/lib/reportApi";
import SkeletonLoader from "@/components/loaders/SkeletonLoader";
import Linkify from "../ui/Linkify";
import Avatar from "../ui/Avatar";


type PostCardProps = {
    post: Post;
    setPost?: React.Dispatch<React.SetStateAction<Post | null>>;
};

const intentIconMap: Record<string, LucideIcon> = {
    ask: HelpCircle,
    build: Hammer,
    share: Share2,
    discuss: MessagesSquare,
    reflect: Bookmark,
};

export default function PostCard({ post, setPost }: PostCardProps) {
    const router = useRouter();
    const { userData, setPosts } = useAppContext();
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showLikesModal, setShowLikesModal] = useState(false);
    type PostLike = Post["likes"][number];
    const getLikeUserId = (like: PostLike) =>
        typeof like === "string" ? like : like._id;
    const getUniqueLikes = (likes: Post["likes"]): Post["likes"] =>
        Array.from(
            new Map<string, PostLike>(
                likes
                    .map((like) => [getLikeUserId(like), like] as const)
                    .filter((entry): entry is [string, PostLike] => Boolean(entry[0]))
            ).values()
        );
    const uniqueLikes = getUniqueLikes(post.likes);
    const likeCount = uniqueLikes.length;

    const isOwner = userData?.id === post?.author?._id;
    const isLiked = uniqueLikes.some((like) => getLikeUserId(like) === userData?.id);

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [likeAnimating, setLikeAnimating] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

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
        router.push(`/main/user/${post?.author?.username}`)
    }

    const handleLike = async () => {
        try {
            // 🚨 guard: don't proceed if user id missing
            if (!userData?.id) {
                toast.error("User not authenticated");
                return;
            }

            if (!isLiked) {
                setLikeAnimating(true);
                setTimeout(() => setLikeAnimating(false), 300);
            }

            const updatedLikes = isLiked
                ? uniqueLikes.filter((like) => getLikeUserId(like) !== userData.id)
                : getUniqueLikes([...uniqueLikes, userData.id]);

            // ✅ update local state safely
            if (setPost) {
                setPost(prev =>
                    prev
                        ? {
                            ...prev,
                            likes: updatedLikes,
                        }
                        : prev
                );
            } else {
                setPosts(prev =>
                    prev.map(p =>
                        p._id === post._id
                            ? { ...p, likes: updatedLikes }
                            : p
                    )
                );
            }

            // ✅ API call
            await axios.put(
                `${BACKEND_URL}/api/posts/${post._id}/like`,
                {},
                { withCredentials: true }
            );
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

    const handleReport = async (reason: ReportReason, details?: string) => {
        await reportPost(post._id, reason, details);
    };

    useEffect(() => {
        if (!menuOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [menuOpen]);

    // prevent crash if author missing
    if (!post?.author) return null;

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const postUrl = `${window.location.origin}/main/post/${post._id}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Check out this post",
                    text: post.content.slice(0, 100),
                    url: postUrl,
                });
            } else {
                await navigator.clipboard.writeText(postUrl);
                toast.success("Post link copied to clipboard");
            }

            // Increment share count in DB
            await axios.put(`${BACKEND_URL}/api/posts/${post._id}/share`, {}, { withCredentials: true });

            // Update local state
            if (setPost) {
                setPost((prev) => prev ? ({
                    ...prev,
                    sharesCount: (prev.sharesCount || 0) + 1,
                }) : prev);
            } else {
                setPosts(prev =>
                    prev.map(p =>
                        p._id === post._id
                            ? { ...p, sharesCount: (p.sharesCount || 0) + 1 }
                            : p
                    )
                );
            }

        } catch {
            // share dismissed or failed
        }
        setMenuOpen(false);
    };

    return (
        <div className="content-card glass-hover relative overflow-clip cursor-pointer"
            onClick={openPost}>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center flex-wrap sm:justify-between w-[90%]">
                    <div className="flex items-center gap-2">
                    <div className="h-8 md:h-12 w-8 md:w-12 rounded-full transition-all duration-200" onClick={(e) => { e.stopPropagation(); openUserProfile(); }}>
                        <Avatar 
                            src={post.author?.avatar} 
                            alt={post.author?.name || "Post author"} 
                            className="h-full w-full" 
                        />
                    </div>
                    <span className="ml-1 font-semibold text-foreground transition-all duration-200 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); openUserProfile(); }}>{post?.author?.name}</span>
                    <span className="surface-text-muted text-[0.9rem] transition-all duration-200 hover:text-foreground" onClick={(e) => { e.stopPropagation(); openUserProfile(); }}>
                        @{post?.author?.username}
                    </span>
                    </div>
                    <div className="w-full sm:w-auto">
                        <p className="text-[0.9rem] font-semibold text-blue-500 flex items-center gap-1.5 truncate">
                            Intent:
                            {(() => {
                                const Icon = post.intent ? intentIconMap[post.intent] : null;
                                return Icon ? <Icon size={16} className="text-blue-500 mt-0.5" /> : null;
                            })()}
                            <span className="capitalize">{post.intent}</span>
                        </p>
                    </div>
                </div>

                <div ref={menuRef} className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }} className="rounded-full p-1 transition-colors hover:bg-accent/70">
                        <MoreHorizontal size={20} className="mt-0.5 cursor-pointer text-foreground" />
                    </button>

                    {menuOpen && (
                        <div className="absolute overflow-clip top-0 right-0 w-30 bg-background border border-border rounded-md shadow-lg z-50">
                            <button
    className="w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-black/3 dark:hover:bg-white/5"
    onClick={handleShare}
>
    <Forward size={14} />
    Share post
</button>
                            {!isOwner && (
<button
className="w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-black/3 dark:hover:bg-white/5"
onClick={(e) => {
e.stopPropagation();
setMenuOpen(false);
setShowReportModal(true);
}}
> <Flag size={14} />
Report post </button>
)}

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
                           
                        </div>
                    )}
                </div>
            </div>

            {post.content && (
                <p className="mt-2 mb-3 p-1 text-[0.9rem] text-foreground md:text-[1.1rem]">
                    <Linkify text={post.content} />
                </p>
            )}

            {post.image && (
                <div className="w-full mb-4 rounded-xl overflow-hidden border border-white/10 max-h-125">
                    {!imageLoaded && (
                        <SkeletonLoader
                            count={1}
                            height="h-[500px]"
                            className="w-full"
                        />
                    )}

                    <img
                        src={post.image}
                        alt="Post attachment"
                        onLoad={() => setImageLoaded(true)}
                        className={`w-full h-full object-cover ${imageLoaded ? "block" : "hidden"
                            }`}           
                    />
                </div>
            )}
            <div className="flex w-full gap-x-2 border-t border-border/80 pt-3 text-foreground sm:justify-between">
                <div className="surface-text-muted flex w-full items-center gap-4 text-sm sm:w-2/3 sm:justify-between">
                    <p className="flex flex-col text-center gap-2 sm:flex-row items-center cursor-pointer hover:text-blue-500 md:w-[20%] justify-center">
                        <MessageCircle className="h-4.5 md:h-5 hover:text-blue-500" />
                        {post.commentsCount || 0} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
                    </p>

                    <p onClick={handleShare} className="flex flex-col text-center sm:flex-row gap-1 items-center cursor-pointer hover:text-blue-500 md:w-[20%] justify-center">
                        <Forward className="h-4.5 md:h-5" />{post.sharesCount || 0} {post.sharesCount === 1 ? 'Share' : 'Shares'}
                    </p>

                    <div className="flex flex-col text-center sm:flex-row gap-1 items-center md:w-[20%] justify-center">
                        <button onClick={(e) => { e.stopPropagation(); handleLike() }} className="p-0 hover:text-blue-500">
                            <Heart className={`h-4.5 md:h-5 cursor-pointer transition-transform duration-300 hover:text-blue-500 ${isLiked ? "text-blue-500" : ""} ${likeAnimating ? "scale-135" : "scale-100"}`} fill={isLiked ? "currentColor" : "none"} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowLikesModal(true) }} className="cursor-pointer text-sm hover:text-blue-500">
                            {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
                        </button>
                    </div>
                </div>

                <div>
                    <p className="text-sm sm:text-md">{timeAgo(post.createdAt)}</p>
                </div>
            </div>

            <PostDelete
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

            <LikesModal
                open={showLikesModal}
                onClose={() => setShowLikesModal(false)}
                likers={uniqueLikes}
            />
        </div>
    );
}
