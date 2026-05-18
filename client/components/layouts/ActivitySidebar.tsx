"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import FollowButton from "../ui/FollowButton";
import { useRouter } from "next/navigation";
import InlineLoader from "../loaders/InlineLoader";
import type { UserSummary } from "@/lib/types";

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

type UserSummaryWithFollowState = UserSummary & {
  isFollowedByCurrentUser?: boolean;
  isRequestedByCurrentUser?: boolean;
};

type SidebarUser = {
  username?: string;
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { userData } = useAppContext();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const router = useRouter();

  const hydrateUsersWithFollowState = useCallback(
    async <T extends SidebarUser>(usersToHydrate: T[]): Promise<T[]> => {
      const hydratedUsers = await Promise.all(
        usersToHydrate.map(async (user) => {
          if (!user.username) {
            return {
              ...user,
              isFollowedByCurrentUser: false,
              isRequestedByCurrentUser: false,
            };
          }
          try {
            const { data } = await axios.get<UserSummaryWithFollowState>(
              `${BACKEND_URL}/api/users/${user.username}`,
              { withCredentials: true }
            );
            return {
              ...user,
              isFollowedByCurrentUser: data.isFollowedByCurrentUser ?? false,
              isRequestedByCurrentUser: data.isRequestedByCurrentUser ?? false,
            };
          } catch (error) {
            console.error("Failed to hydrate sidebar follow state", error);
            return {
              ...user,
              isFollowedByCurrentUser: false,
              isRequestedByCurrentUser: false,
            };
          }
        })
      );
      return hydratedUsers as T[];
    },
    [BACKEND_URL]
  );

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
          { withCredentials: true }
        );
        const hydratedUsers = await hydrateUsersWithFollowState<SuggestedUser>(
          res.data.users || []
        );
        setUsers(hydratedUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [BACKEND_URL, hydrateUsersWithFollowState, userData?.id]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get<SearchResponse>(
          `${BACKEND_URL}/api/users/search?query=${searchQuery}`,
          { withCredentials: true }
        );
        const hydratedUsers = await hydrateUsersWithFollowState<User>(
          res.data.users || []
        );
        setSearchResults(hydratedUsers);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery, BACKEND_URL, hydrateUsersWithFollowState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = users;
  const handleClick = (username?: string) => {
    if (!username) return;
    router.push(`/main/user/${username}`);
  };

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
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
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

        {/* Search input with dropdown */}
        <div className="relative mt-7 mb-5">
          <div className="search-pill">
            <Search className="h-5" />
            <input
              type="text"
              placeholder="Search users"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setDropdownOpen(true)}
              className="h-full w-full bg-transparent outline-0 placeholder:text-muted-foreground"
            />
          </div>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {searching ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No users found
                </div>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div
                      className="flex flex-1 cursor-pointer items-center gap-3"
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push(`/main/user/${user.username}`);
                      }}
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <img
                          src={user.avatar || "/default-avatar.png"}
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <FollowButton
                      userId={user._id}
                      isFollowing={user.isFollowedByCurrentUser ?? false}
                      isRequested={user.isRequestedByCurrentUser ?? false}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <p className="flex items-center gap-2 text-[1.1rem] font-semibold text-foreground">
          <UserPlus className="h-5 text-blue-500" />
          Suggestions
        </p>

        <div className="mt-5 flex max-h-[60vh] min-h-[60vh] w-70 flex-col gap-6 overflow-y-auto pr-1">
          {loading ? (
            <InlineLoader text="Loading users..." />
          ) : filteredUsers.length === 0 ? (
            <p className="surface-text-muted text-sm">No suggestions available.</p>
          ) : (
            filteredUsers.map((suggestedUser) => (
              <div key={suggestedUser._id} className="flex items-center gap-2">
                <div className="h-12 w-12 overflow-hidden rounded-full">
                  <img
                    src={suggestedUser.avatar || "/default-avatar.png"}
                    alt={suggestedUser.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex w-30 flex-col">
                  <p
                    className="cursor-pointer truncate text-[0.9rem] hover:text-blue-600"
                    onClick={() => handleClick(suggestedUser.username)}
                  >
                    {suggestedUser.name}
                  </p>
                  <p className="truncate text-[0.8rem] opacity-50">
                    {suggestedUser.bio || "No bio available"}
                  </p>
                </div>
                <FollowButton
                  userId={suggestedUser._id}
                  isFollowing={suggestedUser.isFollowedByCurrentUser ?? false}
                  isRequested={suggestedUser.isRequestedByCurrentUser ?? false}
                />
              </div>
            ))
          )}
        </div>

        <p className="surface-text-muted mt-10 text-center text-[0.8rem]">
          All rights reserved @Vector 2026
        </p>
      </div>
    </>
  );
}
