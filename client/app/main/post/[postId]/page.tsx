"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import PostCard from "@/components/feed/Postcard";
import CommentsSection from "@/components/feed/CommentsSection";
import Navbar from "@/components/Navbar";
import SkeletonLoader from "@/components/loaders/SkeletonLoader";

export default function PostPage() {
  const { postId } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await axios.get(
          `${BACKEND_URL}/api/posts/${postId}`,
          { withCredentials: true }
        );
        setPost(data);
      } catch {
        console.error("Failed to fetch post");
      } finally {
        setLoading(false);
      }
    };

    if (postId) fetchPost();
  }, [postId]);

  if (loading) return <div className="p-10"><SkeletonLoader count={1} height="h-64" /></div>;
  if (!post) return <p className="p-10">Post not found</p>;

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