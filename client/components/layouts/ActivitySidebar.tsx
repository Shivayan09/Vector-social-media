"use client";

import { Search, UserPlus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import FollowButton from "../ui/FollowButton";
import { useRouter } from "next/navigation";
import InlineLoader from "../loaders/InlineLoader";

type SuggestedUser = {
  _id: string;
  name: string;
  username: string;
  bio?: string;
  avatar?: string;
  isFollowedByCurrentUser?: boolean;
  isRequestedByCurrentUser?: boolean;
};

type User = {
  _id: string;
  name: string;
  username?: string;
  avatar?: string;
  isFollowedByCurrentUser?: boolean;
  isRequestedByCurrentUser?: boolean;
};

type SuggestionsResponse = {
  users?: SuggestedUser[];
};

type SearchResponse = {
  users?: User[];
};

export default function ActivitySidebar() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { userData } = useAppContext();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const router = useRouter();

  useEffect(() => {
    if (!userData?.id) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await axios.get<SuggestionsResponse>(
          `${BACKEND_URL}/api/users/suggestions`,
          { withCredentials: true },
        );
        setUsers(res.data.users || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [BACKEND_URL, userData?.id]);

  useEffect(() => {
    if (!userData?.id) {
      setResults([]);
      setSearching(false);
      setIsDebouncing(false);
      return;
    }

    if (!query.trim()) {
      setResults([]);
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);

    const delay = setTimeout(async () => {
      setIsDebouncing(false);
      try {
        setSearching(true);
        const res = await axios.get<SearchResponse>(
          `${BACKEND_URL}/api/users/search?query=${query}`,
          { withCredentials: true },
        );
        setResults(res.data.users || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [BACKEND_URL, query, userData?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClick = (username?: string) => {
    if (!username) {
      return;
    }
    router.push(`/main/user/${username}`);
  };

  // 1. Search Results: Only hide the current user (so people can still search for pending users)
  const filteredSearchResults = results.filter(
    (user) => user._id !== userData?.id,
  );

  // 2. Suggestions: Hide the current user AND users with pending requests
  const filteredUsers = users.filter(
    (user) => user._id !== userData?.id && !user.isRequestedByCurrentUser,
  );
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-50 rounded-full bg-blue-500 p-2 text-white shadow-lg lg:hidden"
      >
        <UserPlus />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        ref={wrapperRef}
        className={`glass-surface-strong fixed top-0 right-0 z-50 h-screen w-fit p-5 transform transition-transform duration-300 md:min-h-screen md:h-fit lg:static ${
          open ? "translate-x-0" : "translate-x-full"
        } lg:translate-x-0`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-foreground lg:hidden"
        >
          <X />
        </button>

        <p className="ml-2 text-[1.1rem] font-semibold text-foreground">
          Search people you know
        </p>

        {/* Search */}
        <div className="relative mt-7 mb-5">
          <div className="search-pill">
            <Search className="h-5" />
            <input
              type="text"
              placeholder="Search users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full w-full bg-transparent outline-0 placeholder:text-muted-foreground"
            />
          </div>

          {query.trim() && (
            <div className="absolute z-50 mt-2 w-full max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
              {isDebouncing || searching ? (
                <InlineLoader text="Searching..." />
              ) : filteredSearchResults.length === 0 ? (
                <p className="p-4 text-sm surface-text-muted">
                  No users found.
                </p>
              ) : (
                filteredSearchResults.map((user) => {
                  const followsYou = !!userData?.followers?.includes(user._id);

                  return (
                    <div
                      key={user._id}
                      className="flex items-center gap-2 p-3 hover:bg-accent/40 cursor-pointer"
                      onClick={() => handleClick(user.username)}
                    >
                      <div className="h-12 w-12 rounded-full overflow-hidden">
                        <Image
                          src={user.avatar || "/default-avatar.png"}
                          alt={user.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex flex-col flex-1">
                        <p className="truncate">{user.name}</p>
                        <p className="opacity-50 text-xs">@{user.username}</p>
                      </div>

                      <FollowButton
                        userId={user._id}
                        isFollowing={user.isFollowedByCurrentUser ?? false}
                        isRequested={user.isRequestedByCurrentUser ?? false}
                        isFollowBack={
                          !(user.isFollowedByCurrentUser ?? false) && followsYou
                        }
                      />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <p className="flex items-center gap-2 text-[1.1rem] font-semibold text-foreground">
          <UserPlus className="h-5 text-blue-500" />
          Suggestions
        </p>

        {/* Suggestions only */}
        <div className="mt-5 flex flex-col gap-6 w-70 min-h-[60vh] max-h-[60vh] overflow-y-auto hide-scrollbar pr-1">
          {loading ? (
            <InlineLoader text="Loading users..." />
          ) : filteredUsers.length === 0 ? (
            <p className="surface-text-muted text-sm">No users found.</p>
          ) : (
            filteredUsers.map((suggestedUser) => {
              const followsYou = !!userData?.followers?.includes(
                suggestedUser._id,
              );

              return (
                <div
                  key={suggestedUser._id}
                  className="flex items-center gap-2"
                >
                  <div className="h-12 w-12 rounded-full overflow-hidden">
                    <Image
                      src={suggestedUser.avatar || "/default-avatar.png"}
                      alt={suggestedUser.name}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col w-30">
                    <p
                      className="text-[0.9rem] truncate cursor-pointer hover:text-blue-600"
                      onClick={() => handleClick(suggestedUser.username)}
                    >
                      {suggestedUser.name}
                    </p>

                    <p className="opacity-50 text-[0.8rem] truncate">
                      {suggestedUser.bio || "No bio available"}
                    </p>
                  </div>

                  <FollowButton
                    userId={suggestedUser._id}
                    isFollowing={suggestedUser.isFollowedByCurrentUser ?? false}
                    isRequested={
                      suggestedUser.isRequestedByCurrentUser ?? false
                    }
                    isFollowBack={
                      !(suggestedUser.isFollowedByCurrentUser ?? false) &&
                      followsYou
                    }
                  />
                </div>
              );
            })
          )}
        </div>

        <p className="surface-text-muted mt-10 text-center text-[0.8rem]">
          All rights reserved @Vector 2026
        </p>
      </div>
    </>
  );
}
