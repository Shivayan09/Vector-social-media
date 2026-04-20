"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "react-toastify";
import axios from "axios";
import { useRouter } from "next/navigation";

type CreateModalProps = {
    onClose: () => void;
    onPostCreated: (post: any) => void;
};

export default function CreatePostModal({onClose,onPostCreated}: CreateModalProps) {
    const [visible, setVisible] = useState(false);
    const [intent, setIntent] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        setVisible(true);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { data } = await axios.post(BACKEND_URL + "/api/posts",{ content, intent }, { withCredentials: true }
            );
            if (!data.success || !data.post) {
                toast.error("Failed to post");
                return;
            } else {
                toast.success("Posted!");
                router.push('/main');
            }
            onPostCreated(data.post);
            handleClose();
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <div onClick={handleClose} className={`fixed inset-0 z-60 bg-black/60 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`} />

            <div className={`neo-shell fixed z-60 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[40vw] p-6 transition-all duration-200 ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
                <div className="flex justify-between items-center">
                    <p className="text-[1.2rem] font-semibold">Create a post</p>
                    <button onClick={handleClose} className="cursor-pointer">
                        <X />
                    </button>
                </div>

                <div className="mt-5 mb-3 flex items-center gap-3">
                    <p>Select your intent :</p>
                    <select value={intent} onChange={(e) => setIntent(e.target.value)} className="neo-select cursor-pointer px-5 py-1 outline-none">
                        <option value="" disabled>Choose</option>
                        <option value="ask">Ask</option>
                        <option value="build">Build</option>
                        <option value="share">Share</option>
                        <option value="discuss">Discuss</option>
                        <option value="reflect">Reflect</option>
                    </select>
                </div>

                <textarea placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} className="neo-textarea w-full h-32 p-3 outline-none" />

                <div className="flex justify-between gap-3 mt-4">
                    <Button variant="outline" onClick={handleClose} className="cursor-pointer w-[47%]">
                        Discard
                    </Button>

                    <Button disabled={loading || !intent || !content.trim()} onClick={handlePost} className="cursor-pointer w-[47%] text-white">
                        {loading ? "Posting..." : "Post"}
                    </Button>
                </div>
            </div>
        </>
    );
}
