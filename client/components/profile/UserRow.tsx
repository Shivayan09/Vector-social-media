"use client";

import { useRouter } from "next/navigation";
import FollowButton from "@/components/ui/FollowButton";
import { useAppContext } from "@/context/AppContext";

export default function UserRow({ user }: { user: any }) {

    const router = useRouter();
    const { userData } = useAppContext();
    const isSelf = user._id === userData?.id;
    const isFollowing = user.followers?.includes(userData?.id);

    return (
        <div className="neo-panel-soft flex relative items-center justify-between px-3 py-2 rounded-lg cursor-pointer">
            <div className="absolute h-full w-[80%]" onClick={() => router.push(`/main/user/${user.username}`)}></div>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/main/user/${user.username}`)}>
                <img src={user.avatar || "/default-avatar.png"} className="h-12 w-12 rounded-full object-cover" />
                <div>
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-sm text-blue-200">@{user.username}</p>
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
