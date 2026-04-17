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
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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
      className="w-full px-3 sm:px-5 py-3 rounded-2xl bg-black/10 backdrop-blur-xl border border-white/10 hover:shadow-lg transition cursor-pointer"
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
            <span className="capitalize">{post.intent}</span>
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

      {/* ACTIONS (FIXED) */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 text-white border-t border-white/20 pt-3 text-sm">
        <div className="flex justify-around sm:justify-start gap-4 sm:gap-6 w-full">
          <p className="flex items-center gap-1 cursor-pointer hover:text-blue-500">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            {post.commentsCount || 0}{" "}
            {post.commentsCount === 1 ? "Comment" : "Comments"}
          </p>

          <p
            onClick={handleShare}
            className="flex items-center gap-1 cursor-pointer hover:text-blue-500"
          >
            <Forward className="h-4 w-4 sm:h-5 sm:w-5" />0 Shares
          </p>

          <p
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            className="flex items-center gap-1 cursor-pointer hover:text-blue-500"
          >
            <Heart
              className={`h-4 w-4 sm:h-5 sm:w-5 ${
                isLiked ? "text-blue-500" : ""
              }`}
              fill={isLiked ? "currentColor" : "none"}
            />
            {post.likes?.length || 0}{" "}
            {post.likes?.length === 1 ? "Like" : "Likes"}
          </p>
        </div>

        <p className="text-xs sm:text-sm">{timeAgo(post.createdAt)}</p>
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
