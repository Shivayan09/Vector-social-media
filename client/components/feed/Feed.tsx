"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import PostList from "./PostList";
import { useAppContext } from "@/context/AppContext";
import CreatePostPopup from "./CreatePostPopup";

export default function Feed() {
    const { posts, setPosts } = useAppContext();
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);

    const fetchPosts = useCallback(async (pageNum: number) => {
        if (loading || !hasMore) return;
        try {
            setLoading(true);
            const res = await axios.get(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/posts?page=${pageNum}&limit=10`,
                { withCredentials: true }
            );
            if (pageNum === 1) {
                setPosts(res.data.posts || []);
            } else {
                setPosts(prev => [...prev, ...res.data.posts]);
            }
            setHasMore(res.data.hasMore);
        } catch (error) {
            console.error("Failed to fetch posts", error);
            if (pageNum === 1) setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, setPosts]);

    useEffect(() => {
        fetchPosts(1);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.1 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, loading]);

    useEffect(() => {
        if (page > 1) {
            fetchPosts(page);
        }
    }, [page]);

    return (
        <div className="hide-scrollbar w-full px-5 md:px-10 pb-10">
            <PostList posts={posts} />
            {loading && (
                <div className="flex flex-col gap-3 mt-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse" />
                    ))}
                </div>
            )}
            <div ref={observerTarget} className="h-10" />
            <CreatePostPopup />
        </div>
    );
}