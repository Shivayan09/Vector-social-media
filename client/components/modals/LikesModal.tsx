"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useMounted } from "@/lib/useMounted";
import UserRow from "../profile/UserRow";
import type { Post, UserSummary } from "@/lib/types";

type LikesModalProps = {
  open: boolean;
  onClose: () => void;
  likers: (string | UserSummary)[];
  postId: string;
};

export default function LikesModal({ open, onClose, likers, postId }: LikesModalProps) {
  const mounted = useMounted();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const [resolvedLikers, setResolvedLikers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fallbackLikers = useMemo(
    () =>
      Array.from(
        new Map(
          likers
            .filter(
              (liker): liker is UserSummary =>
                typeof liker === "object" && liker !== null && "_id" in liker
            )
            .map((liker) => [liker._id, liker])
        ).values()
      ),
    [likers]
  );

  useEffect(() => {
    if (!open || !postId) return;

    const fetchLikers = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get<Post>(`${BACKEND_URL}/api/posts/${postId}`, {
          withCredentials: true,
        });

        const populatedLikers = Array.from(
          new Map(
            (data.likes || [])
              .filter(
                (liker): liker is UserSummary =>
                  typeof liker === "object" && liker !== null && "_id" in liker
              )
              .map((liker) => [liker._id, liker])
          ).values()
        );

        setResolvedLikers(populatedLikers);
      } catch {
        setResolvedLikers(fallbackLikers);
      } finally {
        setLoading(false);
      }
    };

    void fetchLikers();
  }, [BACKEND_URL, fallbackLikers, open, postId]);

  const userLikers = resolvedLikers.length > 0 ? resolvedLikers : fallbackLikers;

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-[90%] max-w-md rounded-xl bg-white dark:bg-blue-950 p-5 shadow-lg transform transition-all duration-200 ${
          open
            ? "scale-100 translate-y-0 opacity-100"
            : "scale-95 translate-y-2 opacity-0"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <p className="text-[1.2rem] font-semibold">
            {userLikers.length} {userLikers.length === 1 ? "Like" : "Likes"}
          </p>
          <button onClick={onClose} className="cursor-pointer">
            <X />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">Loading likes...</p>
        ) : userLikers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No likes yet</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="flex flex-col gap-3">
              {userLikers.map((user) => (
                <UserRow key={user._id} user={user} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
