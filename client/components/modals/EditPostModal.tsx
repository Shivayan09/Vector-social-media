"use client";

import { X, Image as ImageIcon, Send, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "react-toastify";
import axios from "axios";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

type EditPostModalProps = {
  post: Post;
  onClose: () => void;
  onPostUpdated: (post: Post) => void;
};

export default function EditPostModal({
  post,
  onClose,
  onPostUpdated,
}: EditPostModalProps) {
  const [visible, setVisible] = useState(true);
  const [intent, setIntent] = useState(post.intent || "");
  const [content, setContent] = useState(post.content || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    post.image || null,
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const MAX_CHARS = 1000;
  const charsLeft = MAX_CHARS - content.length;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleEdit = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("content", content.trim());
      formData.append("intent", intent);
      formData.append("removeImage", String(removeImage));
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const { data } = await axios.put(
        `${BACKEND_URL}/api/posts/${post._id}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (!data.success || !data.post) {
        toast.error("Failed to update post");
        return;
      }

      toast.success("Post updated successfully!");
      onPostUpdated(data.post);
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const intents = [
    { value: "ask", label: "Ask" },
    { value: "build", label: "Build" },
    { value: "share", label: "Share" },
    { value: "discuss", label: "Discuss" },
    { value: "reflect", label: "Reflect" },
  ];

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  return (
    <>
      <div
        onClick={handleClose}
        className={cn(
          "fixed inset-0 z-60 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "fixed z-60 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto",
          "glass-surface-strong rounded-3xl shadow-2xl p-0 max-h-[90vh] flex flex-col transition-all duration-300 ease-out border-t border-white/20",
          visible
            ? "opacity-100 scale-100 translate-y-[-50%]"
            : "opacity-0 scale-95 translate-y-[-48%]",
        )}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-foreground">Edit Post</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-foreground/70 hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

   <div className="p-6 overflow-y-auto flex-1">     
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
                      : "bg-black/5 dark:bg-white/5 text-foreground/60 border-transparent hover:border-foreground/20 hover:bg-black/10 dark:hover:bg-white/10",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="relative group">
            <textarea
              placeholder="What's on your mind? Share your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={cn(
                "w-full h-40 resize-none rounded-2xl p-4 outline-none transition-all duration-200",
                "bg-black/5 dark:bg-white/5 border-2 border-transparent focus:border-primary/30",
                "text-foreground placeholder:text-foreground/40 text-lg leading-relaxed",
              )}
            />
            <div
              className={cn(
                "text-xs mt-1 text-right font-medium transition-colors",
                charsLeft < 0
                  ? "text-red-500"
                  : charsLeft < 100
                    ? "text-yellow-500"
                    : "text-foreground/40",
              )}
            >
              {charsLeft} / {MAX_CHARS}
            </div>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mt-4 group">
              <div className="w-full max-h-64 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={800}
                  height={512}
                  unoptimized={imagePreview.startsWith("blob:")}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 bg-red-500/90 p-2 rounded-full text-white shadow-xl hover:bg-red-600 transition-all scale-90 group-hover:scale-100"
                type="button"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}

          {/* Actions Row */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <label className="cursor-pointer group flex items-center gap-2 text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-all active:scale-95">
              <ImageIcon
                size={22}
                className="group-hover:rotate-6 transition-transform"
              />
              <span className="text-sm font-bold">Photo/Video</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (imagePreview?.startsWith("blob:")) {
                      URL.revokeObjectURL(imagePreview);
                    }
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                    setRemoveImage(false);
                  }
                }}
              />
            </label>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="rounded-xl px-6 font-semibold"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  loading ||
                  !intent ||
                  (!content.trim() && !imagePreview) ||
                  charsLeft < 0
                }
                onClick={handleEdit}
                className={cn(
                  "rounded-xl px-8 font-bold shadow-lg transition-all active:scale-95",
                  "bg-primary text-primary-foreground hover:opacity-90",
                )}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Update</span>
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
