"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PostCard from "../feed/Postcard";
import type { Post } from "@/lib/types";

type PostsDisplayProps = {
    userId: string;
    emptyText?: string;
};

export default function PostsDisplay({ userId, emptyText }: PostsDisplayProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
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
        return <p className="text-center text-blue-500/70">Loading posts...</p>;
    }
    if (posts.length === 0) {
        return (
            <p className="text-white text-center mt-3">
                {emptyText ?? "No posts yet!"}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {posts.map((post) => (
                <PostCard key={post._id} post={post} />
            ))}
        </div>
    );
}
