"use client";

import { useRouter } from "next/navigation";
import FollowButton from "@/components/ui/FollowButton";
import { useAppContext } from "@/context/AppContext";

import type { UserSummary } from "@/lib/types";

export default function UserRow({ user }: { user: UserSummary }) {

    const router = useRouter();
    const { userData } = useAppContext();
    const isSelf = user._id === userData?.id;
    // Check if current user is following this user
    // Falls back to userData.following when user.followers is not populated (e.g., in LikesModal)
    const isFollowing = !!userData?.id && (
      user.followers?.includes(userData.id) || userData.following?.includes(user._id) || false
    );

    return (
        <div className="flex relative items-center justify-between px-3 py-2 rounded-lg bg-black/10 backdrop-blur-3xl cursor-pointer">
            <div className="absolute h-full w-[80%]" onClick={() => router.push(`/main/user/${user.username}`)}></div>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/main/user/${user.username}`)}>
                <img alt={user.name || "User avatar"} src={user.avatar || "/default-avatar.png"} className="h-12 w-12 rounded-full object-cover" />
                <div>
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-sm text-white/50">@{user.username}</p>
                </div>
            </div>
            {!isSelf && (
                <FollowButton
                    userId={user._id}
                    isFollowing={isFollowing}
                    onFollowChange={() => { }}
                />
            )}
        </div>
    );
}
