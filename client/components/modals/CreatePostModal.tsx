"use client";

import { X, Image as ImageIcon, Send, Trash2, HelpCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "react-toastify";
import axios from "axios";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type CreateModalProps = {
    onClose: () => void;
    onPostCreated: (post: Post) => void;
};

export default function CreatePostModal({ onClose, onPostCreated }: CreateModalProps) {
    const [visible, setVisible] = useState(true);
    const [intent, setIntent] = useState("");
    const [content, setContent] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);
    const [showGuidelines, setShowGuidelines] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const router = useRouter();

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const MAX_CHARS = 500;

    // --- FIX: Focus trap — traps Tab/Shift+Tab inside modal, restores focus on close ---
    const focusTrapRef = useFocusTrap(visible);

    // --- FIX: Close modal on Esc key ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const savedDraft = localStorage.getItem("postDraft");

        if (savedDraft) {
            // ✅ Wrap in try/catch — bad JSON silently clears the draft
            try {
                const parsedDraft = JSON.parse(savedDraft);

                const shouldRestore = window.confirm(
                    "You have a saved draft. Restore it?"
                );

                if (shouldRestore) {
                    setContent(parsedDraft.content || "");
                    setIntent(parsedDraft.intent || "");

                    if (parsedDraft.savedAt) {
                        setLastSaved(new Date(parsedDraft.savedAt));
                    }
                }
            } catch {
                // Draft is corrupted — remove it and open modal with empty fields
                localStorage.removeItem("postDraft");
            }
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!content.trim() && !intent) return;

            const draftData = {
                intent,
                content,
                savedAt: new Date().toISOString(),
            };

            localStorage.setItem(
                "postDraft",
                JSON.stringify(draftData)
            );

            setLastSaved(new Date());
            setAutoSaveStatus("Draft auto-saved");
        }, 5000);

        return () => clearInterval(interval);
    }, [content, intent]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imagePreview]);

    const processFile = (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Only image files are allowed");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("File size must be less than 2MB");
            return;
        }
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter(prev => prev + 1);
        setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter(prev => prev - 1);
        if (dragCounter === 1) {
            setIsDragActive(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        setDragCounter(0);

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        if (files.length > 1) {
            toast.warning("Please drop only one image file");
            return;
        }

        processFile(files[0]);
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
                localStorage.removeItem("postDraft");
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

    // -------------------------------------------------------------------
    // FIX: Save Draft now only saves what can actually be restored.
    // File objects (imageFile) are binary and cannot be serialised into
    // localStorage — so the draft only stores text content and intent,
    // exactly what the restore flow reads back.
    //
    // The Save Draft button is therefore disabled when the only thing
    // present is a selected image with no text or intent chosen.
    // This prevents the misleading UX where a user saves a draft and
    // reopens the modal to find their image gone.
    //
    // canSaveDraft mirrors exactly what the draft actually persists:
    //   content (text) OR intent selection.
    // -------------------------------------------------------------------
    const canSaveDraft = content.trim().length > 0 || intent !== "";

    const handleSaveDraft = () => {
        const draft = {
            content,
            intent,
            savedAt: new Date().toISOString(),
        };

        localStorage.setItem("postDraft", JSON.stringify(draft));

        // Warn the user if they also have an image selected, since it
        // cannot be saved as part of the draft.
        if (imageFile) {
            toast.success("Draft saved! Note: your selected image was not saved and will need to be re-attached.");
        } else {
            toast.success("Draft saved!");
        }

        setLastSaved(new Date());
    };

    const intents = [
        { value: "ask", label: "Ask" },
        { value: "build", label: "Build" },
        { value: "share", label: "Share" },
        { value: "discuss", label: "Discuss" },
        { value: "reflect", label: "Reflect" },
    ];

    return (
        <>
            {/* --- FIX: aria-hidden hides background from screen readers --- */}
            <div 
                onClick={handleClose} 
                aria-hidden="true"
                className={cn(
                    "fixed inset-0 z-60 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                    visible ? "opacity-100" : "opacity-0"
                )}
            />

            {/* --- FIX: role="dialog", aria-modal, aria-labelledby added; focusTrapRef attached --- */}
            <div
                ref={focusTrapRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-post-modal-title"
                className={cn(
                    "fixed z-60 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[45vw] lg:w-[50vw]",
                    "glass-surface-strong rounded-3xl shadow-2xl p-0 overflow-hidden transition-all duration-300 ease-out border-t border-white/20",
                    visible ? "opacity-100 scale-100 translate-y-[-50%]" : "opacity-0 scale-95 translate-y-[-48%]"
                )}>
                <div className="flex justify-between items-center px-6 pt-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {/* --- FIX: id matches aria-labelledby --- */}
                        <h2 id="create-post-modal-title" className="text-xl font-bold text-foreground">Create New Post</h2>
                        <button
                            aria-expanded={showGuidelines}
                            onClick={() => setShowGuidelines((s) => !s)}
                            title="Post guidelines"
                            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-foreground/60"
                        >
                            <HelpCircle size={16} />
                        </button>
                    </div>
                    <button 
                        onClick={handleClose}
                        aria-label="Close modal"
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-foreground/70 hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    {showGuidelines && (
                        <div className="mb-6 p-4 rounded-xl border border-white/10 bg-black/5 dark:bg-white/5 text-sm text-foreground/70">
                            <strong className="block mb-2 text-foreground">Posting Guidelines</strong>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Be respectful and constructive.</li>
                                <li>No harassment, hate, or violence.</li>
                                <li>Avoid spam, self-promotion, and misinformation.</li>
                                <li>Don&apos;t share private or illegal content.</li>
                                <li>Give context and cite sources when possible.</li>
                            </ul>
                        </div>
                    )}
                    {/* Intent Selector */}
                    <div className="mb-6">
                        <label className="text-sm font-semibold text-foreground/80 mb-3 block">
                            What&apos;s the intent of this post?
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {intents.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setIntent(item.value)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                                        intent === item.value
                                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                            : "bg-black/5 dark:bg-white/5 text-foreground/60 border-transparent hover:border-foreground/20 hover:bg-black/10 dark:hover:bg-white/10"
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="relative">
                        <textarea
                            maxLength={MAX_CHARS}
                            autoComplete="off"
                            placeholder="What's on your mind? Share your thoughts..."
                            value={content}
                            onChange={(e) => {
                                const value = e.target.value;

                                if (value.length <= MAX_CHARS) {
                                    setContent(value);
                                } else {
                                    toast.error("Post content cannot exceed 500 characters");
                                }
                            }}
                            className={cn(
                                "w-full h-40 resize-none rounded-2xl p-4 outline-none transition-all duration-200",
                                "bg-black/5 dark:bg-white/5 border-2 border-transparent focus:border-primary/30",
                                "text-foreground placeholder:text-foreground/40 text-lg leading-relaxed"
                            )}
                        />
                    </div>

                    <div className={cn(
                        "text-xs mt-1 text-right font-medium transition-colors",
                        content.trim().length >= MAX_CHARS
                            ? "text-red-500"
                            : content.trim().length >= 400
                                ? "text-yellow-500"
                                : "text-foreground/40"
                    )}>
                        {content.trim().length} / {MAX_CHARS}
                    </div>

                    {lastSaved && (
                        <div className="text-xs mt-1 text-foreground/50">
                            Last saved at {lastSaved.toLocaleTimeString()}
                        </div>
                    )}

                    {autoSaveStatus && (
                        <div className="text-xs text-green-500 mt-1">
                            {autoSaveStatus}
                        </div>
                    )}

                    {/* Drop Zone - Visible when no image selected */}
                    {!imagePreview && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        processFile(file);
                                    }
                                }}
                            />
                            <div
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        fileInputRef.current?.click();
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                className={cn(
                                    "mt-4 p-4 rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center cursor-pointer",
                                    isDragActive
                                        ? "bg-primary/10 border-primary ring-2 ring-primary/30"
                                        : "border-foreground/20 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-foreground/40"
                                )}
                            >
                                <ImageIcon size={28} className={cn(
                                    "mb-2 transition-all duration-200",
                                    isDragActive ? "text-primary animate-bounce" : "text-foreground/50"
                                )} />
                                <p className="text-xs font-semibold text-foreground/70 text-center">
                                    Drop your photos here
                                </p>
                                <p className="text-xs text-foreground/50 mt-0.5 text-center">
                                    or click to upload
                                </p>
                            </div>
                        </>
                    )}

                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="relative mt-4 group">
                            <div className="w-full max-h-48 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                                <Image src={imagePreview} alt="Preview" width={800} height={400} unoptimized className="w-full h-full object-cover" />
                            </div>
                            <button 
                                onClick={() => { if (imagePreview) URL.revokeObjectURL(imagePreview); setImageFile(null); setImagePreview(null); }} 
                                aria-label="Remove image"
                                className="absolute top-3 right-3 bg-red-500/90 p-2 rounded-full text-white shadow-xl hover:bg-red-600 transition-all scale-90 group-hover:scale-100"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex flex-col gap-3 items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-3 w-full">
                            <Button
                                variant="ghost"
                                onClick={handleClose}
                                className="rounded-xl px-4 font-semibold border flex-1"
                            >
                                Cancel
                            </Button>

                            {/* -------------------------------------------------------------------
                                FIX: disabled now uses canSaveDraft instead of (!content.trim() && !imageFile).
                                Previously the button enabled as soon as an image was selected, even
                                with no text or intent — but handleSaveDraft never saved imageFile
                                (File objects cannot be stored in localStorage). This meant clicking
                                Save Draft with an image-only state silently lost the image.
                                Now the button only enables when content or intent is present,
                                i.e. when there is actually something that can be restored later.
                                If the user has both text AND an image, the draft saves the text and
                                a toast warns them the image will need to be re-attached.
                            ------------------------------------------------------------------- */}
                            <Button
                                variant="secondary"
                                onClick={handleSaveDraft}
                                disabled={!canSaveDraft}
                                className="rounded-xl px-4 font-semibold flex-1"
                            >
                                Save Draft
                            </Button>

                            <Button
                                disabled={loading || !intent || (!content.trim() && !imageFile)}
                                onClick={handlePost}
                                className={cn(
                                    "rounded-xl flex-1 px-6 font-bold shadow-lg transition-all active:scale-95",
                                    "bg-primary text-primary-foreground hover:opacity-90"
                                )}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Posting...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>Publish</span>
                                        <Send size={16} />
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}