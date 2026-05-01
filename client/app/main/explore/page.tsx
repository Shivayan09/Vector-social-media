"use client";

import axios from "axios";
import {
  Compass,
  ExternalLink,
  Heart,
  Lightbulb,
  Search,
  Shuffle,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import InlineLoader from "@/components/loaders/InlineLoader";
import type { Intent } from "@/lib/types";

type User = {
  _id: string;
  name: string;
  username?: string;
  avatar?: string;
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

export default function Explore() {
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedTopic, setHighlightedTopic] = useState<Intent | null>(null);
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
        if (axios.isAxiosError(error)) {
          toast.error(
            error.response?.data?.message ||
              "Failed to load explore data"
          );
        } else {
          toast.error("Failed to load explore data");
        }
      } finally {
        setLoading(false);
      }
    };

    if (BACKEND_URL) {
      fetchTopPosts();
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }

      try {
        setSearching(true);
        const res = await axios.get(
          `${BACKEND_URL}/api/users/search?query=${encodeURIComponent(
            query
          )}`,
          { withCredentials: true }
        );

        setResults(res.data.users || []);
        setOpen(true);
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

  const handleRandomTopic = () => {
    if (topicCards.length === 0) return;
    const random =
      topicCards[Math.floor(Math.random() * topicCards.length)];
    setHighlightedTopic(random.intent);
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

  return (
    <div className="w-full py-5 px-7">
        <p className="text-[1.6rem] font-semibold text-center md:text-left text-white">
          Explore
        </p>

        <p className="text-gray-300 text-center md:text-left">
          Discover people, posts and ideas
        </p>

        {/* SEARCH */}
        <div className="relative mt-5" ref={wrapperRef}>
          <div className="flex items-center px-2 gap-2 bg-white/30 dark:bg-black/30 rounded-full h-10">
            <Search className="h-5" />
            <input
              type="text"
              placeholder="Search users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="outline-0 w-full h-full bg-transparent"
            />
          </div>

          {open && (
            <div className="absolute w-full mt-2 bg-white border rounded-xl shadow-lg max-h-75 overflow-y-auto z-50">
              {searching ? (
                <p className="p-4 text-sm opacity-50">
                  Searching...
                </p>
              ) : results.length === 0 ? (
                <p className="p-4 text-sm opacity-50">
                  No users found.
                </p>
              ) : (
                results
                  .filter((user) => user?._id)
                  .map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition"
                      onClick={() => {
                        if (!user?.username) return;
                        router.push(`/main/user/${user.username}`);
                      }}
                    >
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-black/5 dark:bg-white/5">
                        <img
                          src={
                            user.avatar ||
                            "/default-avatar.png"
                          }
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-medium">
                          {user.name}
                        </p>

                        <p className="text-xs opacity-50">
                          @{user?.username || "unknown"}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        {/* TRENDING DOMAINS */}
        <div className="mt-5">
          <p className="font-semibold text-white">
            Trending domains
          </p>

          {loading ? (
            <p className="text-gray-300 mt-3">Loading domains...</p>
          ) : topicCards.length === 0 ? (
            <p className="text-gray-300 mt-3">No active domains yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-5">
              {topicCards.map((topic) => (
                <div
                  key={topic.intent}
                  className={`box h-35 rounded-md overflow-hidden relative border cursor-pointer transition ${
                    highlightedTopic === topic.intent
                      ? "border-blue-400 shadow-lg"
                      : "border-white/20 hover:shadow-md"
                  }`}
                >
                  <p className="absolute z-20 bottom-0 left-0 p-2 w-full flex items-center justify-between bg-black/40 text-white text-sm">
                    <span className="flex items-center gap-2">
                      <ExternalLink className="text-blue-400 h-4" />
                      {topic.label}
                    </span>
                    <span>{topic.count} posts</span>
                  </p>
                  <img
                    src={intentImage[topic.intent]}
                    alt={topic.label}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EXPLORE TOPICS */}
        <div className="mt-5 p-4 rounded-xl border border-white/15 bg-black/15 backdrop-blur-xl text-white">
          <p className="flex items-center gap-2 font-semibold">
            <Compass className="h-5 text-blue-400" />
            Explore topics
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {topicCards.slice(0, 2).map((topic) => (
              <button
                key={topic.intent}
                type="button"
                onClick={() => setHighlightedTopic(topic.intent)}
                className="h-20 border border-white/15 rounded-md flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition"
              >
                {topic.intent === "build" ? (
                  <Trophy className="h-4" />
                ) : (
                  <Lightbulb className="h-4" />
                )}
                <span className="text-sm">{topic.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={handleRandomTopic}
              className="col-span-2 md:col-span-1 h-20 border border-white/15 rounded-md flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition"
            >
              <Shuffle className="h-4 opacity-80" />
              <span className="text-sm">Random</span>
            </button>
          </div>

          {highlightedTopic && (
            <p className="text-sm text-blue-200 mt-3">
              Highlighted topic: {intentLabel[highlightedTopic]}
            </p>
          )}
        </div>

        {/* TRENDING TOPICS */}
        <div className="mt-5 p-4 rounded-xl border border-white/15 bg-black/15 backdrop-blur-xl text-white">
          <p className="flex items-center gap-2 font-semibold">
            <TrendingUp className="h-5 text-blue-400" />
            Trending topics
          </p>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-gray-300">Loading trending topics...</p>
            ) : trendingTopics.length === 0 ? (
              <p className="text-gray-300">No trending topics this month</p>
            ) : (
              trendingTopics.map((topic) => (
                <button
                  type="button"
                  key={topic.id}
                  onClick={() =>
                    router.push(`/main/post/${topic.id}`)
                  }
                  className="w-full text-left flex items-start gap-3 rounded-md hover:bg-white/10 p-2 transition"
                >
                  <div className="h-11 w-11 rounded-md overflow-hidden bg-white/10 shrink-0">
                    <img
                      src={intentImage[topic.intent]}
                      alt={intentLabel[topic.intent]}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{topic.title}</p>
                    <p className="text-xs text-blue-200 mt-1">
                      #{intentLabel[topic.intent]}
                    </p>
                  </div>

                  <p className="flex items-center gap-1 text-xs text-gray-200 pt-1">
                    <Heart
                      className="text-blue-400 h-4"
                      fill="currentColor"
                    />
                    {topic.likes}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* TOP POSTS */}
        <div className="mt-5">
          <p className="font-semibold text-white">
            Top posts of the month
          </p>

          <div className="flex flex-col gap-5 md:flex-row flex-wrap items-stretch mt-5">
            {loading ? (
              <InlineLoader text="Loading top posts..." className="text-gray-300" />
            ) : topPosts.length === 0 ? (
              <p className="text-gray-300">
                No trending posts this month
              </p>
            ) : (
              topPosts
                .filter((post) => post?._id)
                .map((post) => (
                  <div
                    onClick={() => handleClick(post)}
                    key={post._id}
                    className="box w-full md:w-[calc(33.333%-1rem)] h-44 border rounded-md px-5 py-4 relative cursor-pointer backdrop-blur-3xl text-white hover:bg-black/2 flex flex-col justify-between"
                  >
                    <p className="text-blue-300">
                      {post.likes?.length || 0} likes
                    </p>

                    <p className="absolute top-4 right-4 text-[0.9rem] text-blue-600">
                      #{post.intent}
                    </p>

                    <p className="my-3 text-sm line-clamp-3 overflow-hidden">
                      {post.content}
                    </p>

                    <div>
                      <p
                        className="text-[0.9rem] w-fit hover:text-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!post?.author?.username)
                            return;
                          router.push(
                            `/main/user/${post.author.username}`
                          );
                        }}
                      >
                        @{post?.author?.username || "unknown"}
                      </p>

                      <p className="text-gray-300 text-[0.8rem]">
                        {new Date(
                          post.createdAt
                        ).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
    </div>
  );
}
