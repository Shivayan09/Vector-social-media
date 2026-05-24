"use client";

import { Edit, Link, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PostsDisplay from "./PostsDisplay";
import FollowButton from "@/components/ui/FollowButton";
import FollowersDisplay from "./FollowersDisplay";
import FollowingDisplay from "./FollowingDisplay";
import MutualFollowersBar from "./MutualFollowersBar";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import type { UserSummary } from "@/lib/types";
import SavedPostsFeed from "./SavedPostsFeed";

type ProfileLayoutProps = {
  user: UserSummary;
  isFollowing?: boolean;
  isRequested?: boolean;
};

export default function ProfileLayout({ user, isFollowing, isRequested }: ProfileLayoutProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "followers" | "following" | "saved">("posts");

  const router = useRouter();
  const { userData, setUserData } = useAppContext();
  const followsYou = !!userData?.followers?.includes(user._id);
  const isSelfProfile = userData?.id === user._id;
  const tabs = isSelfProfile? ["posts", "followers", "following", "saved"]: ["posts", "followers", "following"];
  const [postsCount, setPostsCount] = useState<number>(0);
  const [following, setFollowing] = useState<boolean>(isFollowing ?? false);
  const [requested] = useState<boolean>(isRequested ?? false);
  const [blocked, setBlocked] = useState<boolean>(user.isBlockedByCurrentUser ?? false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const toggleBlock = async () => {
    try {
      const endpoint = blocked ? `/api/users/${user._id}/unblock` : `/api/users/${user._id}/block`;
      const { data } = await axios.put(`${BACKEND_URL}${endpoint}`, {}, { withCredentials: true });
      if (data.success) {
        setBlocked(!blocked);
        toast.success(data.message);
        if (!blocked) {
          setFollowing(false);
        }
      }
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : "Failed to complete action";
      toast.error(message || "Failed to complete action");
    }
  };

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
    <div className="page-scroll px-4 py-5 sm:px-7 lg:px-8">
      <div className=" mx-auto mb-10 mt-5 max-w-336 md:mt-0 py-2">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
          <div className="relative shrink-0">
            <img alt={user.name || "Profile avatar"} src={user.avatar || "/default-avatar.png"} className="h-30 w-30 rounded-full border object-cover md:h-34 md:w-34" />
            <span className="absolute bottom-5 right-2 h-5 w-5 rounded-full border-2 border-background bg-green-500" />
          </div>

          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div className="flex flex-col text-center sm:text-left">
                <h1 className="text-2xl font-bold text-foreground md:text-[2rem]">
                  {user.name} {user.surname}
                </h1>
                <p className="text-lg text-slate-700 dark:text-slate-300">@{user.username}</p>
              </div>

              {isSelfProfile ? (
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start md:flex-nowrap md:justify-end">
                  <button onClick={() => router.push("/main/settings")}
                    className="flex h-11 w-36 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-foreground/10 text-sm text-foreground transition hover:bg-foreground/15 md:text-[1rem]">
                    <Edit className="h-4" />
                    Edit profile
                  </button>
                  <button onClick={copyProfileLink}
                    className="flex h-11 w-36 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background/60 text-sm text-foreground transition hover:bg-accent md:text-[1rem]">
                    <Link className="h-4" />
                    Copy link
                  </button>
                </div>
              ) : (
                <div className="flex w-full flex-wrap justify-center gap-2 sm:justify-start md:w-auto md:flex-nowrap md:justify-end">
                  {blocked ? (
                    <button onClick={toggleBlock} className="h-9 cursor-pointer rounded-md bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-600">
                      Unblock
                    </button>
                  ) : (
                    <>
                      <FollowButton
                        userId={user._id}
                        isFollowing={following}
                        isFollowBack={!following && followsYou}
                        isRequested={requested}
                        onFollowChange={(next) => {
                          setFollowing(next);
                          setUserData(prev => prev ? {
                            ...prev,
                            following: next
                              ? [...(prev.following || []), user._id]
                              : (prev.following || []).filter(id => id !== user._id),
                          } : null);
                        }}
                      />

                      <button onClick={startChat} className="h-9 w-28 cursor-pointer rounded-md bg-blue-500 text-white transition hover:bg-blue-600">
                        Chat
                      </button>

                      <button onClick={toggleBlock} className="h-9 cursor-pointer rounded-md bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-600">
                        Block
                      </button>
                    </>
                  )}

                  <button onClick={copyProfileLink}
                    className="flex h-9 w-28 cursor-pointer items-center justify-center gap-1 rounded-md border border-border bg-background text-sm text-foreground transition hover:bg-accent">
                    <Link className="h-4" />
                    Copy link
                  </button>
                </div>
              )}
            </div>

            <div className="flex max-w-2xl flex-col gap-2 text-center sm:text-left">
              <p className="text-sm text-foreground">{user.bio}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {user.description}
              </p>
              {user.createdAt && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Joined{" "}
                  {new Date(user.createdAt).toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-3 font-semibold text-foreground sm:justify-start">
              <span className="rounded-full border border-border bg-background/50 px-7 py-3">{user.followersCount ?? user.followers?.length ?? 0} Followers</span>
              <span className="rounded-full border border-border bg-background/50 px-7 py-3">{user.followingCount ?? user.following?.length ?? 0} Following</span>
            </div>

            {/* Social proof - only visible to logged-in users visiting someone else's profile */}
            {!isSelfProfile && (
              <MutualFollowersBar
                mutualFollowers={user.mutualFollowers ?? []}
                mutualFollowersCount={user.mutualFollowersCount ?? 0}
              />
            )}

          </div>
        </div>
      </div>

      <div className="mx-auto mb-8 flex max-w-336 justify-between border-b border-border/80 md:justify-around">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() =>
              setActiveTab(tab as "posts" | "followers" | "following" | "saved")
            }
            className={`relative px-8 pb-4 font-semibold capitalize transition cursor-pointer whitespace-nowrap focus:outline-none ${activeTab === tab
                ? "text-blue-500 dark:text-blue-300"
                : "text-slate-700 hover:text-foreground dark:text-slate-300"
              }`}
          >
            {tab === "posts" ? `${tab} (${postsCount})` : tab}

            {activeTab === tab && (
              <span className="absolute left-1/2 -bottom-px h-0.5 w-24 -translate-x-1/2 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-8 ml-auto max-w-272">
        {user.isBlockedByTarget ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-t border-dashed border-border/50">
            <Lock className="h-12 w-12 mb-3 opacity-30 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">This user is unavailable</h3>
          </div>
        ) : blocked ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-t border-dashed border-border/50">
            <Lock className="h-12 w-12 mb-3 opacity-30 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">You have blocked this user</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">Unblock them to see their posts and follow them.</p>
          </div>
        ) : !canSeeContent ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-t border-dashed border-border/50">
            <Lock className="h-12 w-12 mb-3 opacity-30 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">This account is private</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">Follow this account to see their posts and followers.</p>
          </div>
        ) : (
          <>
            {activeTab === "posts" && (
              <PostsDisplay
                userId={user._id}
                onPostsLoaded={setPostsCount}
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
            {activeTab === "saved" && isSelfProfile && <SavedPostsFeed />}
          </>
        )}
      </div>
    </div>
  );
}