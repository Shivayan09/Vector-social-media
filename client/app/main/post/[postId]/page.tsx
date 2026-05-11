"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { Lock } from "lucide-react";
import PostCard from "@/components/feed/Postcard";
import CommentsSection from "@/components/feed/CommentsSection";
import Navbar from "@/components/Navbar";
import SkeletonLoader from "@/components/loaders/SkeletonLoader";
import type { Post } from "@/lib/types";

export default function PostPage() {
  const { postId } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{
    type: "private" | "not-found";
    message: string;
  } | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setErrorState(null);
        const { data } = await axios.get(
          `${BACKEND_URL}/api/posts/${postId}`,
          { withCredentials: true }
        );
        setPost(data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const message = error.response?.data?.message;

          if (status === 403) {
            setErrorState({
              type: "private",
              message:
                message || "This post is from a private account. Follow them to see it.",
            });
          } else {
            setErrorState({
              type: "not-found",
              message: message || "Post not found",
            });
          }
        } else {
          console.error("Failed to fetch post", error);
          setErrorState({
            type: "not-found",
            message: "Post not found",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (postId) fetchPost();
  }, [BACKEND_URL, postId]);

  if (loading) {
    return (
      <div className="p-10">
        <SkeletonLoader count={1} height="h-64" />
      </div>
    );
  }
  if (!post) {
    if (errorState?.type === "private") {
      return (
        <div className="overflow-y-auto h-screen">
          <Navbar />
          <div className="px-5 py-12 md:px-10">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-20 text-center">
              <Lock className="mb-3 h-12 w-12 text-foreground opacity-30" />
              <h3 className="text-lg font-semibold text-foreground">
                This account is private
              </h3>
              <p className="mt-1 text-sm surface-text-muted">
                {errorState.message}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return <p className="p-10">{errorState?.message || "Post not found"}</p>;
  }

  return (
    <div className="overflow-y-auto h-screen">
      <Navbar />
      <div className="px-5 md:px-10">
        <PostCard post={post} setPost={setPost} />
        <div className="mt-6">
          <CommentsSection postId={post._id} />
        </div>
      </div>
    </div>
  );
}
