"use client";

import ExploreSidebar from "@/components/layouts/ExploreSidebar";
import axios from "axios";
import { ExternalLink, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import InlineLoader from "@/components/loaders/InlineLoader";

type User = {
  _id: string;
  name: string;
  username?: string;
  avatar?: string;
};

export default function Explore() {
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const fetchTopPosts = async () => {
      try {
        const { data } = await axios.get(
          `${BACKEND_URL}/api/posts/top-week`,
          { withCredentials: true }
        );

        setTopPosts(data.posts || []);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTopPosts();
  }, []);

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
          `${BACKEND_URL}/api/users/search?query=${query}`,
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
  }, [query]);

  const handleClick = (post: any) => {
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

  return (
    <div className="flex">
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

        {/* TRENDING */}
        <div className="mt-5">
          <p className="font-semibold text-white">
            Trending domains
          </p>

          <div className="flex justify-between my-5">
            <div className="box h-35 w-[48%] rounded-md overflow-clip relative cursor-pointer hover:shadow-md">
              <p className="absolute z-20 bottom-0 left-0 p-2 w-full flex items-center gap-2 bg-black/30 text-white">
                <ExternalLink className="text-blue-500" />
                Science and technology
              </p>
              <img
                src="/science.webp"
                className="h-full w-full object-cover object-bottom"
              />
            </div>

            <div className="box h-35 w-[48%] rounded-md overflow-clip relative cursor-pointer hover:shadow-md">
              <p className="absolute z-20 bottom-0 left-0 p-2 w-full flex items-center gap-2 bg-black/30 text-white">
                <ExternalLink className="text-blue-500" />
                Sports
              </p>
              <img
                src="/kohli2.jpg"
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>
        </div>

        {/* TOP POSTS */}
        <div className="mt-5">
          <p className="font-semibold text-white">
            Top posts of the week
          </p>

          <div className="flex flex-col gap-5 md:flex-row items-center mt-5">
            {loading ? (
              <InlineLoader text="Loading top posts..." className="text-gray-300" />
            ) : topPosts.length === 0 ? (
              <p className="text-gray-300">
                No trending posts this week
              </p>
            ) : (
              topPosts
                .filter((post) => post?._id)
                .map((post) => (
                  <div
                    onClick={() => handleClick(post)}
                    key={post._id}
                    className="box w-[90%] md:w-[32%] h-44 border rounded-md px-5 py-4 relative cursor-pointer backdrop-blur-3xl text-white hover:bg-black/2 flex flex-col justify-between"
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

      <ExploreSidebar />
    </div>
  );
}