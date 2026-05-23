"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import type { Post } from "@/lib/types";
import PostCard from "@/components/feed/Postcard";
import SkeletonLoader from "@/components/loaders/SkeletonLoader";
import { Bookmark } from "lucide-react";

export default function SavedPostsFeed() {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const [posts, setPosts] = useState<Post[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBookmarks = useCallback(async (cursor: string | null = null) => {
        try {
            const url = cursor
                ? `${BACKEND_URL}/api/posts/bookmarks?cursor=${cursor}`
                : `${BACKEND_URL}/api/posts/bookmarks`;

            const res = await axios.get(url, { withCredentials: true });
            const { posts: newPosts, nextCursor: newCursor } = res.data;

            setPosts(prev => cursor ? [...prev, ...newPosts] : newPosts);
            setNextCursor(newCursor);
        } catch {
            setError("Failed to load saved posts");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [BACKEND_URL]);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    const handleLoadMore = () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        fetchBookmarks(nextCursor);
    };

    // When a post is unbookmarked from inside SavedPostsFeed, remove it from the list
    const handlePostChange = (updatedPost: Post | null) => {
        if (!updatedPost) return;
        if (!updatedPost.isBookmarked) {
            // Post was un-saved — remove it from this feed
            setPosts(prev => prev.filter(p => p._id !== updatedPost._id));
        } else {
            setPosts(prev =>
                prev.map(p => p._id === updatedPost._id ? updatedPost : p)
            );
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-3">
                <SkeletonLoader count={3} height="h-40" className="w-full rounded-xl" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={() => { setError(null); setLoading(true); fetchBookmarks(); }}
                    className="text-blue-500 text-sm underline underline-offset-2"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Bookmark size={36} className="surface-text-muted opacity-40" />
                <p className="text-foreground font-medium">No saved posts yet</p>
                <p className="surface-text-muted text-sm">
                    Bookmark posts from your feed and they&apos;ll appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {posts.map(post => (
                <PostCard
                    key={post._id}
                    post={post}
                    setPost={(updater) => {
                        // setPost accepts a function or value — handle both
                        const updated = typeof updater === "function"
                            ? updater(post)
                            : updater;
                        handlePostChange(updated);
                    }}
                />
            ))}

            {nextCursor && (
                <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-3 text-sm text-blue-500 hover:text-blue-400 transition-colors disabled:opacity-50"
                >
                    {loadingMore ? "Loading..." : "Load more"}
                </button>
            )}
        </div>
    );
}