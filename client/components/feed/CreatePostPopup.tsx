"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Pen } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import CreateModal from "../modals/CreatePostModal";
import type { Post } from "@/lib/types";

export default function CreatePostPopup() {
    const pathname = usePathname();
    const { setPosts } = useAppContext();
    const [open, setOpen] = useState(false);

    if (pathname !== "/main") return null;

    const handlePostCreated = (newPost: Post) => {
        setPosts((prev) => [newPost, ...prev]);
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center
                w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600
                text-white shadow-lg transition cursor-pointer"
            >
                <Pen size={22} />
            </button>

            {open && (
                <CreateModal
                    onClose={() => setOpen(false)}
                    onPostCreated={handlePostCreated}
                />
            )}
        </>
    );
}
