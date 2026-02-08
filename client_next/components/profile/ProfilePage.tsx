"use client";

import { useAppContext } from "@/context/AppContext";
import PostCard from "@/components/feed/Postcard";
import axios from "axios";
import { useEffect, useState } from "react";
import { Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import PostsDislpay from "./PostsDisplay";

export default function ProfilePage() {
    const { userData, posts, setPosts, loading } = useAppContext();
    const [postsLoading, setPostsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"posts" | "followers" | "following">("posts");
    const router = useRouter();

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        if (posts.length > 0) return;

        const fetchPosts = async () => {
            try {
                setPostsLoading(true);
                const { data } = await axios.get(BACKEND_URL + "/api/posts", {
                    withCredentials: true,
                });
                setPosts(data);
            } catch (err) {
                console.error(err);
            } finally {
                setPostsLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading || postsLoading) {
        return <p className="p-10">Loading...</p>;
    }

    if (!userData) {
        return <p className="p-10">Not logged in</p>;
    }

    const userPosts = posts.filter(
        (post) => post.author._id === userData.id
    );

    return (
        <div className="px-7 py-5">
            <div className="flex items-start gap-6 mb-8">
                <img src={userData.avatar || "/default-avatar.png"} className="h-28 w-28 rounded-full object-cover border"/>

                <div className="flex flex-col gap-2 w-full">
                    <div className="w-full flex justify-between">
                        <h1 className="text-2xl font-bold">
                            {userData.name} {userData.surname}
                        </h1>
                        <button className="w-fit px-4 py-1.5 rounded-md border bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 dark:hover:bg-white/10"
                            onClick={() => router.push('/main/settings')}>
                            <Edit className="h-4" /> Edit profile
                        </button>
                    </div>

                    <p className="text-gray-500">
                        @{userData.username}
                    </p>

                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        {userData.bio}
                    </p>

                    <p className="text-sm opacity-80">
                        {userData.description}
                    </p>

                </div>
            </div>
            <div className="flex justify-center gap-50 border-b border-black/10 dark:border-white/10 mb-6">
                {["posts", "followers", "following"].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`relative cursor-pointer pb-2 font-semibold capitalize transition-all duration-200 ${activeTab === tab ? "text-blue-500" : "text-gray-500 hover:text-black dark:hover:text-white"}`}>
                        {tab}
                        {activeTab === tab && (
                            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>
            <div className="mt-4">
                {activeTab === "posts" && (
                    <PostsDislpay/>
                )}

                {activeTab === "followers" && (
                    <p className="text-gray-500 text-center mt-10">
                        Followers coming soon
                    </p>
                )}

                {activeTab === "following" && (
                    <p className="text-gray-500 text-center mt-10">
                        Following coming soon
                    </p>
                )}
            </div>


        </div>
    );
}
