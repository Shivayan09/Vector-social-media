"use client";

import { X, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { toast } from "react-toastify";
import axios from "axios";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/types";

type CreateModalProps = {
    onClose: () => void;
    onPostCreated: (post: Post) => void;
};

export default function CreatePostModal({onClose,onPostCreated}: CreateModalProps) {
    const [visible, setVisible] = useState(true);
    const [intent, setIntent] = useState("");
    const [content, setContent] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append("content", content);
            formData.append("intent", intent);
            if (imageFile) {
                formData.append("image", imageFile);
            }

            const { data } = await axios.post(BACKEND_URL + "/api/posts", formData, { 
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" }
            });
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
            <div onClick={handleClose} className={`fixed inset-0 z-60 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`} />

            <div className={`fixed z-60 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[40vw] bg-white dark:bg-blue-950 border dark:border-white/20 rounded-lg shadow-xl p-6 transition-all duration-200 ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
                <div className="flex justify-between items-center">
                    <p className="text-[1.2rem] font-semibold">Create a post</p>
                    <button onClick={handleClose} className="cursor-pointer">
                        <X />
                    </button>
                </div>

                <div className="mt-5 mb-3 flex items-center gap-3">
                    <p>Select your intent :</p>
                    <select value={intent} onChange={(e) => setIntent(e.target.value)} className="border border-black/20 cursor-pointer px-5 rounded-md py-1 bg-white dark:bg-blue-950 outline-none">
                        <option value="" disabled>Choose</option>
                        <option value="ask">Ask</option>
                        <option value="build">Build</option>
                        <option value="share">Share</option>
                        <option value="discuss">Discuss</option>
                        <option value="reflect">Reflect</option>
                    </select>
                </div>

                <textarea placeholder="What&apos;s on your mind?" value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-32 resize-none border border-black/10 dark:border-white/10 rounded-lg p-3 outline-none" />

                {imagePreview && (
                    <div className="relative mt-3 w-full max-h-48 rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-black/70 transition">
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-3 mt-3">
                    <label className="cursor-pointer flex items-center gap-2 text-blue-500 hover:text-blue-600 transition p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <ImageIcon size={20} />
                        <span className="text-sm font-medium">Add Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                setImageFile(file);
                                setImagePreview(URL.createObjectURL(file));
                            }
                        }} />
                    </label>
                </div>

                <div className="flex justify-between gap-3 mt-4">
                    <Button variant="outline" onClick={handleClose} className="cursor-pointer w-[47%]">
                        Discard
                    </Button>

                    <Button disabled={loading || !intent || (!content.trim() && !imageFile)} onClick={handlePost} className={`cursor-pointer w-[47%] ${loading ? "bg-blue-400 dark:bg-gray-100" : "bg-blue-500 dark:text-white hover:bg-blue-600"}`}>
                        {loading ? "Posting..." : "Post"}
                    </Button>
                </div>
            </div>
        </>
    );
}
