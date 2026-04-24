"use client"

import { useAppContext } from "@/context/AppContext";
import PostCard from "../feed/Postcard";

export default function PostsDislpay() {

    const { userData, posts } = useAppContext();
    const userPosts = posts.filter((post) => post.author._id === userData?.id);
    
    return(
        <div>
            <div className="flex flex-col gap-6">
                {userPosts.length === 0 ? (
                    <p className="text-gray-500">
                        You haven&apos;t posted anything yet.
                    </p>
                ) : (
                    userPosts.map((post) => (
                        <PostCard key={post._id} post={post} />
                    ))
                )}
            </div>
        </div>
    );
}
