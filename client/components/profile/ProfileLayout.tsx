"use client";

import { Edit, Link, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PostsDisplay from "./PostsDisplay";
import FollowButton from "@/components/ui/FollowButton";
import FollowersDisplay from "./FollowersDisplay";
import FollowingDisplay from "./FollowingDisplay";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import type { UserSummary } from "@/lib/types";

type ProfileLayoutProps = {
  user: UserSummary;
  isFollowing?: boolean;
  isRequested?: boolean;
};

export default function ProfileLayout({ user, isFollowing, isRequested }: ProfileLayoutProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "followers" | "following">("posts");

  const router = useRouter();
  const { userData } = useAppContext();
  const isSelfProfile = userData?.id === user._id;
  const [following, setFollowing] = useState<boolean>(isFollowing ?? false);
  const [requested] = useState<boolean>(isRequested ?? false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const startChat = async () => {
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/conversation`,
        { receiverId: user._id },
        { withCredentials: true }
      );

      router.push(`/main/chat/${data._id}`);
    } catch (error) {
      console.error("Failed to start chat", error);
    }
  };

  const copyProfileLink = () => {
    const url = `${window.location.origin}/main/user/${user.username}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied!");
  };

  const canSeeContent = isSelfProfile || !user.isPrivate || following;

  return (
    <div className="page-scroll px-7 py-5">
      <div className="mb-5 md:mb-7">

        <div className="flex items-start gap-6 mt-5 md:mt-0">

          <img alt={user.name || "Profile avatar"} src={user.avatar || "/default-avatar.png"} className="h-28 w-28 rounded-full object-cover border shrink-0"/>

          <div className="flex flex-col gap-2 w-full">

            <div className="flex justify-between items-start flex-wrap gap-3">
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-foreground md:text-2xl">
                  {user.name} {user.surname}
                </h1>
                <p className="surface-text-muted">@{user.username}</p>
              </div>

              {isSelfProfile ? (
                <div className="flex gap-2">
                  <button onClick={() => router.push("/main/settings")}
                    className="w-32 text-sm md:text-[1rem] py-1.5 rounded-md cursor-pointer bg-blue-500 text-white hover:bg-blue-600 transition flex items-center justify-center gap-1">
                    <Edit className="h-4" />
                    Edit profile
                  </button>
                  <button onClick={copyProfileLink}
                    className="w-32 text-sm md:text-[1rem] py-1.5 rounded-md cursor-pointer border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition flex items-center justify-center gap-1">
                    <Link className="h-4" />
                    Copy link
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 w-full sm:w-fit">

                  <FollowButton
                    userId={user._id}
                    isFollowing={following}
                    isRequested={requested}
                    onFollowChange={setFollowing}
                  />

                  <button onClick={startChat} className="bg-blue-500 h-9 w-1/2 sm:w-30 text-white rounded-md cursor-pointer">
                    Chat
                  </button>

                  <button onClick={copyProfileLink}
                    className="h-9 w-1/2 sm:w-30 text-sm rounded-md cursor-pointer border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition flex items-center justify-center gap-1">
                    <Link className="h-4" />
                    Copy link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <p className="text-sm text-foreground">{user.bio}</p>

          <p className="surface-text-muted text-sm">
            {user.description}
          </p>

          <div className="mt-2 flex justify-center gap-6 font-semibold text-foreground">
            <span>{user.followersCount ?? user.followers?.length ?? 0} Followers</span>
            <span>{user.followingCount ?? user.following?.length ?? 0} Following</span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-between border-b-2 border-border/80 md:justify-center md:gap-50">
        {["posts", "followers", "following"].map((tab) => (
          <button
            key={tab}
            onClick={() =>
              setActiveTab(tab as "posts" | "followers" | "following")
            }
            className={`relative pb-2 font-semibold capitalize transition cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? "text-blue-500 dark:text-blue-300"
                : "text-foreground/75 hover:text-foreground"
            }`}
          >
            {tab}

            {activeTab === tab && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!canSeeContent ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-t border-dashed border-border/50">
            <Lock className="h-12 w-12 mb-3 opacity-30 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">This account is private</h3>
            <p className="text-sm surface-text-muted">Follow this account to see their posts and followers.</p>
          </div>
        ) : (
          <>
            {activeTab === "posts" && (
              <PostsDisplay
                userId={user._id}
                emptyText={
                  isSelfProfile
                    ? "You haven&apos;t posted anything yet."
                    : "This user hasn&apos;t posted yet."
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
          </>
        )}
      </div>
    </div>
  );
}