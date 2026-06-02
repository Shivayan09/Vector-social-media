"use client";

import { useEffect, useState, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import axios from "axios";
import PostCard from "../feed/Postcard";
import SkeletonLoader from "../loaders/SkeletonLoader";
import type { Post } from "@/lib/types";

type PostsDisplayProps = {
  userId: string;
  onPostsLoaded?: Dispatch<SetStateAction<number>>;
  emptyText?: string;
};

export default function PostsDisplay({
  userId,
  onPostsLoaded,
  emptyText,
}: PostsDisplayProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);

        const { data } = await axios.get(
          `${BACKEND_URL}/api/posts/user/${userId}`,
          {
            withCredentials: true,
            params: { limit: 10 },
          }
        );

        setPosts(data.posts || []);
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
        onPostsLoaded?.(data.posts?.length || 0);
      } catch {
        setPosts([]);
        onPostsLoaded?.(0);
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    };

    fetchPosts();
  }, [BACKEND_URL, onPostsLoaded, userId]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !nextCursor) return;

    try {
      setLoadingMore(true);

      const { data } = await axios.get(
        `${BACKEND_URL}/api/posts/user/${userId}`,
        {
          withCredentials: true,
          params: { cursor: nextCursor, limit: 10 },
        }
      );

      setPosts((prev) => [...prev, ...(data.posts || [])]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // silently fail — user can retry by clicking Load More again
    } finally {
      setLoadingMore(false);
    }
  }, [BACKEND_URL, loadingMore, nextCursor, userId]);

  // Loading state
  if (loading) {
    return (
      <div className="mt-4 space-y-4">
        <SkeletonLoader count={3} height="h-40" />
      </div>
    );
  }

  // Empty state
  if (posts.length === 0 && initialLoadDone) {
    return (
      <div className="mt-6 rounded-2xl border border-border/50 bg-background/30 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground sm:text-base">
          {emptyText ?? "No posts yet!"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {posts.map((post) => (
        <div
          key={post._id}
          className="rounded-2xl transition-all duration-200"
        >
          <PostCard post={post} />
        </div>
      ))}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="cursor-pointer rounded-full border border-border bg-background/60 px-6 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent hover:shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
