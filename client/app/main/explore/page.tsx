"use client";

import axios from "axios";
import Image from "next/image";
import {
  ExternalLink,
  Flame,
  Heart,
  LayoutGrid,
  Search,
  TrendingUp,
  UserPlus,
  UserCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import InlineLoader from "@/components/loaders/InlineLoader";
import type { Intent } from "@/lib/types";
import { getErrorMessage } from "@/lib/error";

type User = {
  _id: string;
  name: string;
  username?: string;
  avatar?: string;
};

type SuggestedUser = {
  _id: string;
  name: string;
  username?: string;
  avatar?: string;
  bio?: string;
  isFollowedByCurrentUser: boolean;
  isRequestedByCurrentUser: boolean;
};

type SearchPost = {
  _id: string;
  content: string;
  intent: Intent;
  author?: {
    username?: string;
  };
};

type TopPost = {
  _id: string;
  content: string;
  intent: Intent;
  likes?: string[];
  createdAt: string;
  author?: {
    username?: string;
  };
};

const intentLabel: Record<Intent, string> = {
  ask: "Ask",
  build: "Build",
  share: "Share",
  discuss: "Discuss",
  reflect: "Reflect",
};

const intentImage: Record<Intent, string> = {
  ask: "/science.webp",
  build: "/tech.png",
  share: "/political.avif",
  discuss: "/sports.avif",
  reflect: "/kohli2.jpg",
};

/** Shared explore surfaces — semantic tokens only (no ad-hoc zinc palette). */
const exploreCard =
  "rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/70";

const exploreGridCard = `${exploreCard} cursor-pointer hover:-translate-y-0.5`;

const ALL_INTENTS = ["ask", "build", "share", "discuss", "reflect"] as const;

export default function Explore() {
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [postResults, setPostResults] = useState<SearchPost[]>([]);
  const [searching, setSearching] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [followingState, setFollowingState] = useState<Record<string, "follow" | "requested" | "following">>({});
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const topicCards = useMemo(() => {
    const counts: Record<Intent, number> = {
      ask: 0,
      build: 0,
      share: 0,
      discuss: 0,
      reflect: 0,
    };

    topPosts.forEach((post) => {
      if (post.intent in counts) {
        counts[post.intent] += 1;
      }
    });

    return Object.entries(counts)
      .map(([intent, count]) => ({
        intent: intent as Intent,
        label: intentLabel[intent as Intent],
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .filter((topic) => topic.count > 0)
      .slice(0, 3);
  }, [topPosts]);

  const trendingTopics = useMemo(() => {
    return topPosts.slice(0, 5).map((post) => ({
      id: post._id,
      title: post.content,
      likes: post.likes?.length || 0,
      intent: post.intent,
    }));
  }, [topPosts]);

  useEffect(() => {
    const fetchTopPosts = async () => {
      try {
        const { data } = await axios.get(
          `${BACKEND_URL}/api/posts/top-month`,
          { withCredentials: true }
        );

        setTopPosts(data.posts || []);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Failed to load explore data"));
      } finally {
        setLoading(false);
      }
    };

    if (BACKEND_URL) {
      fetchTopPosts();
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        const { data } = await axios.get(
          `${BACKEND_URL}/api/users/suggestions`,
          { withCredentials: true }
        );
        const users: SuggestedUser[] = data.users || [];
        setSuggestedUsers(users);
        const initialState: Record<string, "follow" | "requested" | "following"> = {};
        users.forEach((u) => {
          if (u.isFollowedByCurrentUser) initialState[u._id] = "following";
          else if (u.isRequestedByCurrentUser) initialState[u._id] = "requested";
          else initialState[u._id] = "follow";
        });
        setFollowingState(initialState);
      } catch {
        // suggestions are non-critical, fail silently
      } finally {
        setSuggestionsLoading(false);
      }
    };

    if (BACKEND_URL) {
      fetchSuggestedUsers();
    }
  }, [BACKEND_URL]);

  const handleToggleFollow = async (userId: string) => {
    try {
      const res = await axios.put(
        `${BACKEND_URL}/api/users/${userId}/follow`,
        {},
        { withCredentials: true }
      );

      setFollowingState((prev) => {
        if (res.data.requested !== undefined) {
          return {
            ...prev,
            [userId]: res.data.requested ? "requested" : "follow",
          };
        }
        return {
          ...prev,
          [userId]: res.data.followed ? "following" : "follow",
        };
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update follow status"));
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setPostResults([]);
      setOpen(false);
      setIsDebouncing(false);
      return;
    }

    setOpen(true);
    setIsDebouncing(true);

    const delay = setTimeout(async () => {
      setIsDebouncing(false);
      try {
        setSearching(true);
        const res = await axios.get(
          `${BACKEND_URL}/api/users/search?query=${encodeURIComponent(
            query
          )}`,
          { withCredentials: true }
        );

        setResults(res.data.users || []);
        setPostResults(res.data.posts || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [query, BACKEND_URL]);

  const handleClick = (post: TopPost) => {
    router.push(`/main/post/${post._id}`);
  };

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
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayedUsers = showAllSuggestions
  ? suggestedUsers
  : suggestedUsers.slice(0, 4);

  return (
    <div className="w-full min-w-0 overflow-x-hidden py-5 px-4 sm:px-7">
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="page-title text-[1.6rem]">Explore</p>
          <p className="page-subtitle">
            Discover posts, people, and trends
          </p>
        </header>

        {/* Single column: app layout already includes Sidebar — avoid a second column/aside. */}
        <div className="min-w-0 space-y-8">
          <section
            className="space-y-3"
            aria-labelledby="explore-search-heading"
          >
            <h2
              id="explore-search-heading"
              className="text-sm font-semibold text-foreground"
            >
              Search
            </h2>
            <div className="relative min-w-0" ref={wrapperRef}>
                <div className="search-pill flex min-h-11 items-center gap-2 px-3 py-1">
                  <Search
                    className="h-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    type="text"
                    placeholder="Search users and posts"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-h-10 min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>

                {open && (
                  <div className="absolute z-50 mt-2 max-h-75 w-full min-w-0 max-w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                    {isDebouncing || searching ? (
                      <div className="p-4">
                        <InlineLoader text="Searching..." />
                      </div>
                    ) : results.length === 0 && postResults.length === 0? (
                      <div className="p-4 text-center">
                        <p className="text-sm font-medium text-foreground">
                          No users found for &quot;{query}&quot;
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Try searching something else or explore by intent
                        </p>
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          {ALL_INTENTS.map((intent) => (
                            <button
                              key={intent}
                              type="button"
                              onClick={() => {
                                setQuery(intent);
                              }}
                              className="min-h-10 rounded-full border border-border bg-card px-3 text-xs capitalize text-foreground/80 transition-colors duration-200 hover:border-border/70 hover:bg-accent/50"
                            >
                              #{intent}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {results
                          .filter((user) => user?._id)
                          .map((user) => (
                            <div
                              key={user._id}
                              className="flex min-h-11 cursor-pointer items-center gap-3 p-3 transition-colors duration-200 hover:bg-accent/40"
                              onClick={() => {
                                if (!user?.username) return;
                                router.push(`/main/user/${user.username}`);
                              }}
                            >
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                                <Image
                                  src={user.avatar || "/default-avatar.png"}
                                  alt={user.name}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {user.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  @{user?.username || "unknown"}
                                </p>
                              </div>
                            </div>
                          ))}

                        {postResults.length > 0 && (
                          <>
                            <p className="border-t border-border px-3 pb-1 pt-3 text-xs font-semibold text-muted-foreground">
                              Posts
                            </p>

                            {postResults.map((post) => (
                              <div
                                key={post._id}
                                className="min-w-0 cursor-pointer border-t border-border p-3 transition-colors duration-200 hover:bg-accent/40"
                                onClick={() => {
                                  router.push(`/main/post/${post._id}`);
                                }}
                              >
                                <p className="line-clamp-2 text-sm">
                                  {post.content}
                                </p>
                                <p className="mt-1 text-xs text-blue-500">
                                  #{post.intent}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  @{post.author?.username || "unknown"}
                                </p>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section
              className="panel-card space-y-4"
              aria-labelledby="explore-suggestions-heading"
            >
              <h2
                id="explore-suggestions-heading"
                className="flex items-center gap-2 font-semibold text-foreground"
              >
                <Users className="h-5 shrink-0 text-blue-400" aria-hidden />
                People you might know
              </h2>

              {suggestionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading suggestions...</p>
              ) : suggestedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No suggestions right now</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayedUsers.map((user) => {
                    const state = followingState[user._id] ?? "follow";

                    

                    return (
                      <div
                        key={user._id}
                        className={`${exploreCard} flex items-center gap-3 p-3`}
                      >
                        <div
                          className="h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full bg-muted"
                          onClick={() => user.username && router.push(`/main/user/${user.username}`)}
                        >
                          <Image
                            src={user.avatar || "/default-avatar.png"}
                            alt={user.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => user.username && router.push(`/main/user/${user.username}`)}
                        >
                          <p className="truncate text-sm font-medium text-foreground">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            @{user.username || "unknown"}
                          </p>
                          {user.bio && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {user.bio}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleFollow(user._id)}
                          className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                            state === "following"
                              ? "border-border bg-accent text-foreground hover:bg-accent/70"
                              : state === "requested"
                              ? "border-border bg-accent text-muted-foreground hover:bg-accent/70"
                              : "border-blue-500 bg-blue-500 text-white hover:bg-blue-600"
                          }`}
                        >
                          {state === "following" ? (
                            <>
                              <UserCheck className="h-3 w-3" aria-hidden />
                              Following
                            </>
                          ) : state === "requested" ? (
                            <>
                              <UserCheck className="h-3 w-3" aria-hidden />
                              Requested
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3 w-3" aria-hidden />
                              Follow
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {suggestedUsers.length > 4 && !showAllSuggestions && (
                <button
                  type="button"
                  onClick={() => setShowAllSuggestions(true)}
                  className="w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-accent/50"
                >
                  Show More
                </button>
              )}
            </section>

            <section
              className="panel-card space-y-3"
              aria-labelledby="explore-intents-heading"
            >
              <h2
                id="explore-intents-heading"
                className="text-sm font-semibold text-foreground"
              >
                Browse by intent
              </h2>
              <p className="text-xs text-muted-foreground">
                Prefill search with an intent hashtag
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_INTENTS.map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => setQuery(intent)}
                    className="min-h-10 rounded-full border border-border bg-card px-3 text-xs capitalize text-foreground/80 transition-colors duration-200 hover:border-border/70 hover:bg-accent/50"
                  >
                    #{intent}
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="explore-domains-heading">
              <h2
                id="explore-domains-heading"
                className="mb-3 flex items-center gap-2 font-semibold text-foreground"
              >
                <LayoutGrid className="h-5 shrink-0 text-blue-400" aria-hidden />
                Trending domains
              </h2>

              {loading ? (
                <p className="surface-text-muted text-sm">
                  Loading domains...
                </p>
              ) : topicCards.length === 0 ? (
                <p className="surface-text-muted text-sm">
                  No active domains yet
                </p>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {topicCards.map((topic) => (
                    <div
                      key={topic.intent}
                      className={`${exploreGridCard} relative min-h-40 overflow-hidden`}
                    >
                      <p className="absolute bottom-0 left-0 z-20 flex w-full items-center justify-between bg-black/40 p-2 text-sm text-white">
                        <span className="flex min-w-0 items-center gap-2">
                          <ExternalLink className="h-4 shrink-0 text-blue-400" />
                          <span className="truncate">{topic.label}</span>
                        </span>
                        <span className="shrink-0 pl-2">{topic.count} posts</span>
                      </p>
                      <Image
                        src={intentImage[topic.intent]}
                        alt={topic.label}
                        width={400}
                        height={240}
                        className="h-full min-h-40 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section
              className="panel-card space-y-4"
              aria-labelledby="explore-trending-topics-heading"
            >
              <h2
                id="explore-trending-topics-heading"
                className="flex items-center gap-2 font-semibold text-foreground"
              >
                <TrendingUp className="h-5 shrink-0 text-blue-400" aria-hidden />
                Trending topics
              </h2>

              <div className="flex flex-col gap-3">
                {loading ? (
                  <p className="surface-text-muted text-sm">
                    Loading trending topics...
                  </p>
                ) : trendingTopics.length === 0 ? (
                  <p className="surface-text-muted text-sm">
                    No trending topics this month
                  </p>
                ) : (
                  trendingTopics.map((topic) => (
                    <button
                      type="button"
                      key={topic.id}
                      onClick={() => router.push(`/main/post/${topic.id}`)}
                      className={`${exploreCard} flex w-full min-w-0 items-start gap-3 p-3 text-left md:hover:-translate-y-0.5`}
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                        <Image
                          src={intentImage[topic.intent]}
                          alt={intentLabel[topic.intent]}
                          width={44}
                          height={44}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm">{topic.title}</p>
                        <p className="mt-1 text-xs text-blue-500">
                          #{intentLabel[topic.intent]}
                        </p>
                      </div>

                      <p className="surface-text-muted flex shrink-0 items-center gap-1 pt-1 text-xs">
                        <Heart
                          className="h-4 text-blue-400"
                          fill="currentColor"
                          aria-hidden
                        />
                        {topic.likes}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section aria-labelledby="explore-top-posts-heading">
              <h2
                id="explore-top-posts-heading"
                className="mb-3 flex items-center gap-2 font-semibold text-foreground"
              >
                <Flame className="h-5 shrink-0 text-blue-400" aria-hidden />
                Top posts of the month
              </h2>

              <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {loading ? (
                  <div className="col-span-full">
                    <InlineLoader
                      text="Loading top posts..."
                      className="surface-text-muted"
                    />
                  </div>
                ) : topPosts.length === 0 ? (
                  <p className="surface-text-muted col-span-full text-sm">
                    No trending posts this month
                  </p>
                ) : (
                  topPosts
                    .filter((post) => post?._id)
                    .map((post) => (
                      <div
                        onClick={() => handleClick(post)}
                        key={post._id}
                        className="content-card glass-hover relative flex min-h-44 w-full min-w-0 cursor-pointer flex-col justify-between transition-all duration-200 hover:shadow-md md:hover:-translate-y-0.5"
                      >
                        <p className="text-sm text-blue-500">
                          {post.likes?.length || 0} likes
                        </p>

                        <p className="absolute right-4 top-4 text-sm text-blue-600">
                          #{post.intent}
                        </p>

                        <p className="my-3 line-clamp-3 min-w-0 text-sm">
                          {post.content}
                        </p>

                        <div className="min-w-0">
                          <p
                            className="w-fit max-w-full truncate text-sm hover:text-blue-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!post?.author?.username) return;
                              router.push(
                                `/main/user/${post.author.username}`
                              );
                            }}
                          >
                            @{post?.author?.username || "unknown"}
                          </p>

                          <p className="surface-text-muted text-xs">
                            {new Date(post.createdAt).toLocaleDateString(
                              "en-GB"
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>
        </div>
      </div>
    </div>
  );
}
