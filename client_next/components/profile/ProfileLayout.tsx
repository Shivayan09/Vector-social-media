"use client";

import { Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PostsDisplay from "./PostsDisplay";
import FollowButton from "@/components/ui/FollowButton";
import FollowersDisplay from "./FollowersDisplay";
import FollowingDisplay from "./FollowingDisplay";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";

type ProfileLayoutProps = {
  user: any;
  isFollowing?: boolean;
};

export default function ProfileLayout({ user, isFollowing }: ProfileLayoutProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "followers" | "following">("posts");

  const router = useRouter();
  const { userData } = useAppContext();

  const isSelfProfile = userData?.id === user._id;

  const [followersCount, setFollowersCount] = useState(
    user.followers?.length || 0
  );
  const [followingCount] = useState(user.following?.length || 0);
  const [following, setFollowing] = useState(isFollowing ?? false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const startChat = async () => {
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/conversation`, { receiverId: user._id }, { withCredentials: true });

      router.push(`/main/chat/${data._id}`);

    } catch (error) {
      console.error("Failed to start chat", error);
    }
  };

  return (
    <div className="px-7 py-5 h-screen overflow-y-auto">
      <div className="flex flex-col md:flex-row items-start gap-6 mb-5 md:mb-7">
        <img src={user.avatar || "/default-avatar.png"} className="h-28 w-28 rounded-full object-cover border mx-auto md:mx-0" />

        <div className="flex flex-col gap-2 w-full">
          <div className="w-full flex justify-between items-start gap-3 md:gap-0">
            <h1 className="text-xl md:text-2xl font-bold md:text-left text-white">
              {user.name} {user.surname}
            </h1>

            {isSelfProfile ? (
              <button onClick={() => router.push("/main/settings")} className="w-32 text-sm md:text-[1rem] py-1.5 rounded-md cursor-pointer bg-blue-500 text-white hover:bg-blue-600 transition flex items-center justify-center gap-1 mx-auto md:mx-0">
                <Edit className="h-4" />
                Edit profile
              </button>
            ) : (
              <div>
                <FollowButton
                  userId={user._id}
                  isFollowing={following}
                  onFollowChange={(next) => {
                    setFollowing(next);
                    setFollowersCount((prev: number) =>
                      next ? prev + 1 : prev - 1
                    );
                  }}
                />
                <button onClick={startChat} className="bg-blue-500 h-9 w-30 ml-2 text-white rounded-md cursor-pointer">
                  Chat
                </button>
              </div>
            )}
          </div>

          <p className="text-gray-300 text-left">
            @{user.username}
          </p>

          <p className="mt-2 text-sm text-white/70 dark:text-gray-300 text-left">
            {user.bio}
          </p>

          <p className="text-sm opacity-80 text-left text-white/70">
            {user.description}
          </p>

          <div className="flex gap-6 text-sm font-semibold mt-2 justify-center md:justify-start text-white">
            <span>{followersCount} Followers</span>
            <span>{followingCount} Following</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between md:justify-center md:gap-50 border-b-2 border-white/50 mb-6">
        {["posts", "followers", "following"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`relative pb-2 font-semibold capitalize transition cursor-pointer whitespace-nowrap ${activeTab === tab ? "text-blue-500" : "text-white text-shadow-lg dark:hover:text-white"}`}>
            {tab}
            {activeTab === tab && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "posts" && (
          <PostsDisplay
            userId={user._id}
            emptyText={
              isSelfProfile
                ? "You haven't posted anything yet."
                : "This user hasn't posted yet."
            }
          />
        )}

        {activeTab === "followers" && (
          <FollowersDisplay
            userId={user._id}
            emptyText={
              isSelfProfile
                ? "You have no followers yet."
                : "No followers yet."
            }
          />
        )}

        {activeTab === "following" && (
          <FollowingDisplay
            userId={user._id}
            emptyText={
              isSelfProfile
                ? "You are not following anyone yet."
                : "Not following anyone."
            }
          />
        )}
      </div>
    </div>
  );
}
