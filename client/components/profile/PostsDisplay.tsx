"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PostCard from "../feed/Postcard";
import SkeletonLoader from "../loaders/SkeletonLoader";
import type { Post } from "@/lib/types";

type PostsDisplayProps = {
    userId: string;
    emptyText?: string;
};

export default function PostsDisplay({ userId, emptyText }: PostsDisplayProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(5);
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const { data } = await axios.get(`${BACKEND_URL}/api/posts/user/${userId}`, { withCredentials: true });
                setPosts(data.posts);
            } catch {
                setPosts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, [BACKEND_URL, userId]);
    if (loading) {
        return (
            <div className="mt-4">
                <SkeletonLoader count={3} height="h-40" />
            </div>
        );
    }
    if (posts.length === 0) {
        return (
            <p className="text-white text-center mt-3">
                {emptyText ?? "No posts yet!"}
            </p>
        );
    }

    const handleLoadMore = () => {
        setVisibleCount((prev) => prev + 5);
    };

    return (
        <div className="flex flex-col gap-3">
            {posts.slice(0, visibleCount).map((post) => (
                <PostCard key={post._id} post={post} />
            ))}
            
            {visibleCount < posts.length && (
                <button 
                    onClick={handleLoadMore} 
                    className="mt-2 w-fit self-end px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition duration-200 font-medium cursor-pointer"
                >
                    Load More
                </button>
            )}
        </div>
    );
}
