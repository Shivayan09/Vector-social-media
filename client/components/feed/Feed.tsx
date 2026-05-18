"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import PostList from "./PostList";
import { useAppContext } from "@/context/AppContext";
import CreatePostPopup from "./CreatePostPopup";
import SkeletonLoader from "../loaders/SkeletonLoader";
import type { Post } from "@/lib/types";

function mergeUniquePosts(primaryPosts: Post[], secondaryPosts: Post[]): Post[] {
    const seenIds = new Set<string>();
    const mergedPosts: Post[] = [];

    for (const post of [...primaryPosts, ...secondaryPosts]) {
        if (!post?._id || seenIds.has(post._id)) {
            continue;
        }

        seenIds.add(post._id);
        mergedPosts.push(post);
    }

    return mergedPosts;
}

export default function Feed() {
    const { posts, setPosts } = useAppContext();
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const hasMoreRef = useRef(true);

    const fetchPosts = useCallback(async (pageNum: number) => {
        if (loadingRef.current || !hasMoreRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
            const feedRequest = axios.get(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/posts?page=${pageNum}&limit=10`,
                { withCredentials: true }
            );

            if (pageNum === 1) {
                const [feedRes, topWeekRes] = await Promise.all([
                    feedRequest,
                    axios.get(
                        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/posts/top-week?limit=3`,
                        { withCredentials: true }
                    ),
                ]);

                const rankedTopPosts = topWeekRes.data.posts || [];
                const feedPosts = feedRes.data.posts || [];

                setPosts(mergeUniquePosts(rankedTopPosts, feedPosts));
                hasMoreRef.current = feedRes.data.hasMore;
                return;
            }

            const res = await feedRequest;
            if (pageNum === 1) {
                setPosts(res.data.posts || []);
            } else {
                setPosts(prev => mergeUniquePosts(prev, res.data.posts || []));
            }
            hasMoreRef.current = res.data.hasMore;
        } catch (error) {
            console.error("Failed to fetch posts", error);
            if (pageNum === 1) setPosts([]);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [setPosts]);

    useEffect(() => {
        fetchPosts(1);
    }, [fetchPosts]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.1 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (page > 1) fetchPosts(page);
    }, [page, fetchPosts]);

    const displayPosts = useMemo(() => posts, [posts]);

    return (
        <div className="hide-scrollbar w-full px-5 md:px-10 pb-10">
            <PostList posts={displayPosts} />
            {loading && (
                <div className="mt-4">
                    <SkeletonLoader count={3} height="h-40" />
                </div>
            )}
            {!loading && !hasMoreRef.current && posts.length > 0 && (
                <div className="flex flex-col items-center gap-3 py-10 select-none all-caught-up">
                    <div className="checkmark-circle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <p className="text-sm font-semibold tracking-wide">You&apos;re all caught up!</p>
                    <p className="text-xs opacity-50">New posts will appear when you come back</p>
                    <div className="gradient-divider" />
               </div>
            )}
            <div ref={observerTarget} className="h-10" />
            <CreatePostPopup />
        </div>
    );
}
