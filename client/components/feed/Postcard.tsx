"use client";

import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import {
  MessageCircle,
  Heart,
  MoreHorizontal,
  Trash2,
  Flag,
  Share2,
  Forward,
  HelpCircle,
  Hammer,
  Bookmark,
  MessagesSquare,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import PostDelete from "../modals/DeleteWarning";
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

export default function PostCard({ post }: PostCardProps) {
  if (!post?.author) return null;

  const router = useRouter();
  const { userData, setPosts } = useAppContext();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const isOwner = userData?.id === post?.author?._id;
  const isLiked = post.likes?.map(String).includes(String(userData?.id));

  const timeAgo = (dateString: string) => {
    const diff = Math.floor(
      (Date.now() - new Date(dateString).getTime()) / 1000,
    );
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const openPost = () => router.push(`/main/post/${post._id}`);
  const openUserProfile = () =>
    router.push(`/main/user/${post?.author?.username}`);

  const handleLike = async () => {
    try {
      const updatedLikes = isLiked
        ? post.likes.filter((id: string) => String(id) !== String(userData?.id))
        : [...post.likes, userData?.id];

      setPosts((prev) =>
        prev.map((p) =>
          p._id === post._id ? { ...p, likes: updatedLikes } : p,
        ),
      );

      // optional API (ignore if 404)
      // await axios.put(`${BACKEND_URL}/api/posts/${post._id}/like`);
    } catch {
      toast.error("Failed to like post");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/main/post/${post._id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div
      className="w-full max-w-2xl mx-auto px-3 sm:px-5 py-3 rounded-2xl bg-black/10 backdrop-blur-xl border border-white/10 hover:shadow-lg transition cursor-pointer"
      onClick={openPost}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <img
            src={post?.author?.avatar || "/default-avatar.png"}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
            onClick={(e) => {
              e.stopPropagation();
              openUserProfile();
            }}
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-white font-semibold text-sm sm:text-base">
              {post?.author?.name}
            </span>
            <span className="text-xs sm:text-sm text-white/60">
              @{post?.author?.username}
            </span>
          </div>

          <div className="flex items-center gap-1 text-blue-500 text-xs sm:text-sm">
            {(() => {
              const Icon = intentIconMap[post.intent];
              return Icon ? <Icon size={14} /> : null;
            })()}
            <span>{post.intent}</span>
          </div>
        </div>

        {/* MENU */}
        <div ref={menuRef} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            <MoreHorizontal className="text-white" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-md z-50">
              <button
                className="w-full px-3 py-2 text-sm"
                onClick={handleShare}
              >
                Share
              </button>
              {isOwner ? (
                <button
                  className="w-full px-3 py-2 text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(true);
                  }}
                >
                  Delete
                </button>
              ) : (
                <button
                  className="w-full px-3 py-2 text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReportModal(true);
                  }}
                >
                  Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <p className="text-sm sm:text-base text-gray-200 mb-4 break-words">
        {post.content}
      </p>

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3 border-t border-white/10 pt-3 text-white text-sm">
        <div className="flex justify-between sm:justify-start w-full gap-6">
          <div className="flex items-center gap-1">
            <MessageCircle size={16} />
            {post.commentsCount || 0}
          </div>

          <div onClick={handleShare} className="cursor-pointer">
            <Forward size={16} />
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            className="flex items-center gap-1 cursor-pointer"
          >
            <Heart size={16} fill={isLiked ? "white" : "none"} />
            {post.likes?.length || 0}
          </div>
        </div>

        <span className="text-xs text-white/60">{timeAgo(post.createdAt)}</span>
      </div>

      <PostDelete
        open={showDeleteModal}
        content={post.content}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => setShowDeleteModal(false)}
      />

      <ReportPost
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={() => {}}
      />

      {showComments && <CommentsSection postId={post._id} />}
    </div>
  );
}
