"use client";

import { useAppContext } from "@/context/AppContext";
import { Bookmark, Heart, MessageCircle, Repeat, HelpCircle, Hammer, Share2, MessagesSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PostCardProps = {
    post: any;
};

const intentIconMap: Record<string, any> = {
    ask: HelpCircle,
    build: Hammer,
    share: Share2,
    discuss: MessagesSquare,
    reflect: Bookmark,
};

export default function PostCard({ post }: PostCardProps) {

    const { userData } = useAppContext();

    const [liked, setLiked] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [menuOpen]);

    return (
        <div className="border overflow-clip relative border-black/10 dark:border-white/10 bg-white dark:bg-black cursor-pointer hover:shadow-md dark:hover:scale-[1.01] px-5 py-3 hover:bg-gray-50 rounded-2xl transition">

            <div className="flex items-center gap-2 mb-1">
                <div className="h-8 md:h-10 w-8 md:w-10 rounded-full">
                    <img
                        src={post.author.avatar || "/default-avatar.png"}
                        className="h-full w-full rounded-full object-cover"
                    />

                </div>

                <span className="font-semibold">{post.author.username}</span>

                <span className="text-[0.9rem] text-gray-500 hidden md:flex">
                    @{post.author.username}
                </span>

                <p className="ml-auto text-[0.9rem] font-semibold text-blue-500 flex items-center gap-1.5">
                    {(() => {
                        const Icon = intentIconMap[post.intent];
                        return Icon ? <Icon size={16} className="text-blue-500 mt-0.5" /> : null;
                    })()}
                    <span className="capitalize">{post.intent}</span>
                </p>

                <div ref={menuRef} className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(prev => !prev);
                        }}
                        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <MoreHorizontal size={20} className="text-gray-400 cursor-pointer mt-0.5" />
                    </button>

                    {menuOpen && (
                        <div className="absolute overflow-clip top-0 right-0 w-30 bg-white dark:bg-black border border-black/10 dark:border-white/20 rounded-md shadow-lg z-50">
                            <button className="w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-red-500 transition-all duration-300 hover:bg-black/3 dark:hover:bg-white/5" onClick={() => { setMenuOpen(false) }}>
                                <Trash2 size={14} />
                                Delete post
                            </button>
                            <button className="w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-blue-500 transition-all duration-300 hover:bg-black/3 dark:hover:bg-white/5" onClick={() => { setMenuOpen(false) }}>
                                <Share2 size={14} />
                                Share post
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <p className="mt-2 mb-5 text-[0.9rem] md:text-[1rem]">
                {post.content}
            </p>

            <div className="flex justify-between text-gray-500">
                <p className="flex gap-1 items-center">
                    <MessageCircle size={20} className="hover:text-blue-500" />0
                </p>
                <p className="flex gap-1 items-center">
                    <Repeat size={20} className="hover:text-blue-500" />0
                </p>
                <p className="flex gap-1 items-center" onClick={() => setLiked(prev => !prev)}>
                    <Heart size={20} className={`cursor-pointer hover:text-blue-500 ${liked ? "text-blue-500" : ""}`} fill={liked ? "currentColor" : "none"} />
                    0
                </p>
            </div>
        </div>
    );
}
