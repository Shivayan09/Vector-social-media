"use client";

import { Edit, Users, User, FileText, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PostsDisplay from "./PostsDisplay";
import FollowButton from "@/components/ui/FollowButton";
import FollowersDisplay from "./FollowersDisplay";
import FollowingDisplay from "./FollowingDisplay";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import type { UserSummary } from "@/lib/types";

type ProfileLayoutProps = {
  user: UserSummary;
  isFollowing?: boolean;
};

export default function ProfileLayout({ user, isFollowing }: ProfileLayoutProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "followers" | "following">("posts");

  const router = useRouter();
  const { userData } = useAppContext();
  const isSelfProfile = userData?.id === user._id;
  const [following, setFollowing] = useState<boolean>(isFollowing ?? false);

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

  return (
    <div className="page-scroll flex flex-col gap-4 px-4 py-4 md:px-7 md:py-5">
      {/* Profile Card */}
      <div className="glass-surface rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <img alt={user.name || "Profile avatar"} src={user.avatar || "/default-avatar.png"} className="h-28 w-28 rounded-full object-cover border border-surface-border shrink-0"/>

          <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-foreground md:text-2xl">
                  {user.name} {user.surname}
                </h1>
                <p className="surface-text-muted">@{user.username}</p>
              </div>

              {isSelfProfile ? (
                <button onClick={() => router.push("/main/settings")}
                  className="w-32 text-sm md:text-[1rem] py-1.5 rounded-md cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition flex items-center justify-center gap-1 font-medium">
                  <Edit className="h-4" />
                  Edit profile
                </button>
              ) : (
                <div className="flex gap-3 w-full sm:w-fit">
                  <FollowButton
                    userId={user._id}
                    isFollowing={following}
                    onFollowChange={setFollowing}
                  />
                  <button onClick={startChat} className="bg-primary hover:bg-primary/90 h-9 w-1/2 sm:w-30 text-primary-foreground rounded-md cursor-pointer flex items-center justify-center gap-2 font-medium transition-all">
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 mt-2">
              {user.bio && <p className="text-sm surface-text-muted">{user.bio}</p>}
              {user.description && <p className="text-sm surface-text-muted">{user.description}</p>}
            </div>

            <div className="mt-2 flex flex-wrap gap-3">
              <div className="flex items-center gap-3 bg-surface-strong border border-surface-border rounded-lg px-4 py-2">
                <Users className="h-6 w-6 text-primary" />
                <div className="flex flex-col">
                  <span className="text-foreground font-bold text-lg leading-tight">{user.followersCount ?? user.followers?.length ?? 0}</span>
                  <span className="surface-text-muted text-xs">Followers</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-surface-strong border border-surface-border rounded-lg px-4 py-2">
                <Users className="h-6 w-6 text-primary" />
                <div className="flex flex-col">
                  <span className="text-foreground font-bold text-lg leading-tight">{user.followingCount ?? user.following?.length ?? 0}</span>
                  <span className="surface-text-muted text-xs">Following</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex glass-surface rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition cursor-pointer relative ${
            activeTab === "posts" ? "text-primary bg-primary/5" : "text-foreground/70 hover:bg-surface-hover"
          }`}
        >
          <FileText className="w-4 h-4" /> Posts
          {activeTab === "posts" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <div className="w-px bg-surface-border" />
        <button
          onClick={() => setActiveTab("followers")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition cursor-pointer relative ${
            activeTab === "followers" ? "text-primary bg-primary/5" : "text-foreground/70 hover:bg-surface-hover"
          }`}
        >
          <Users className="w-4 h-4" /> Followers
          {activeTab === "followers" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <div className="w-px bg-surface-border" />
        <button
          onClick={() => setActiveTab("following")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition cursor-pointer relative ${
            activeTab === "following" ? "text-primary bg-primary/5" : "text-foreground/70 hover:bg-surface-hover"
          }`}
        >
          <User className="w-4 h-4" /> Following
          {activeTab === "following" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {/* Content */}
      <div className="mt-2">
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
