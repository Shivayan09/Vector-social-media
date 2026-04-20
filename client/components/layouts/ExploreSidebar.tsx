"use client";

import { Button } from "../ui/button";
import { Compass, Heart, Lightbulb, Shuffle, TrendingUp, Trophy, UserPlus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface Post {
    _id: string;
    content: string;
    author?: { avatar?: string; username?: string };
    likes?: string[];
}

const EXPLORE_TOPICS = [
    { name: "Ask", intent: "ask", icon: Lightbulb },
    { name: "Build", intent: "build", icon: Trophy },
];

export default function ExploreSidebar() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrendingPosts = async () => {
            try {
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/posts/top-week`
                );
                setTrendingPosts(response.data.posts || []);
            } catch (error) {
                console.error("Failed to fetch trending posts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrendingPosts();
    }, []);

    const handleTopicClick = (intent: string) => {
        router.push(`/main/explore?intent=${intent}`);
        setOpen(false);
    };

    const handleSeeMore = () => {
        router.push("/main");
        setOpen(false);
    };

    return (
        <>
            <button onClick={() => setOpen(true)} className="fixed top-4 right-4 z-50 lg:hidden neo-button p-2 rounded-full text-white" aria-label="Open follow suggestions">
                <UserPlus />
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)}/>
            )}

            <div className={`neo-sidebar-shell h-screen md:min-h-screen text-white md:h-fit w-[86vw] max-w-[22rem] lg:w-[21rem] p-5 fixed lg:static top-0 right-0 z-50 transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"} lg:translate-x-0`}>
                <button onClick={() => setOpen(false)} className="absolute top-4 right-4 lg:hidden" aria-label="Close">
                    <X />
                </button>

                <div className="p-2 pb-4 mb-4 border-b border-blue-200/20">
                <p className="flex items-center gap-1 font-semibold"> <Compass className="h-5 text-blue-500"/> Explore topics</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                    {EXPLORE_TOPICS.map((topic) => (
                        <div 
                            key={topic.name} 
                            onClick={() => handleTopicClick(topic.intent)}
                            className="neo-panel-soft min-h-20 px-3 rounded-md flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px]"
                        >
                            <topic.icon className="h-5 w-5 shrink-0"/>
                            <p className="text-sm leading-none whitespace-nowrap">{topic.name}</p>
                        </div>
                    ))}
                </div>
            </div>

                <div>
                    <p className="flex items-center gap-2 font-semibold"> <TrendingUp className="h-5 text-blue-500"/> Trending topics</p>
                    {loading ? (
                        <div className="neo-panel-soft mt-4 flex items-start gap-3 p-3">
                            <div className="h-12 w-12 shrink-0 bg-blue-950/40 rounded-md overflow-clip border border-blue-200/15"><img src="/cse.jpg" alt="" className="h-full w-full object-cover"/></div>
                            <div className="min-w-0 flex-1 text-[0.95rem] leading-5 break-words">Artificial Intelligence and Machine Learning</div>
                            <p className="flex items-center gap-0.5 text-[0.8rem] shrink-0 pt-1"> <Heart className="text-blue-400 h-4 w-4" fill="currentColor"/> 120</p>
                        </div>
                    ) : (
                        trendingPosts.map(post => (
                            <div key={post._id} className="neo-panel-soft mt-4 flex items-start gap-3 p-3">
                                <div className="h-12 w-12 shrink-0 bg-blue-950/40 rounded-md overflow-clip border border-blue-200/15">
                                    <img 
                                        src={post.author?.avatar || "/default-avatar.png"} 
                                        alt={post.author?.username} 
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="min-w-0 flex-1 text-[0.95rem] leading-5 break-words line-clamp-2">{post.content}</div>
                                <p className="flex items-center gap-0.5 text-[0.8rem] shrink-0 pt-1">
                                    <Heart className="text-blue-400 h-4 w-4" fill="currentColor"/>
                                    {post.likes?.length || 0}
                                </p>
                            </div>
                        ))
                    )}
                </div>
                <Button 
                    onClick={handleSeeMore}
                    className="neo-button mt-5 w-full text-white cursor-pointer">
                    See more
                </Button>
            </div>
        </>
    );
}
