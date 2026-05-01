"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/useMounted";
import { useAppContext } from "@/context/AppContext";
import UserRow from "../profile/UserRow";
import type { UserSummary } from "@/lib/types";

type LikesModalProps = {
  open: boolean;
  onClose: () => void;
  likers: (string | UserSummary)[];
};

export default function LikesModal({ open, onClose, likers }: LikesModalProps) {
  const mounted = useMounted();
  const { userData } = useAppContext();

  // Backend always populates likes with full user objects (username, name, avatar, _id)
  // Filter ensures we only render valid user objects, ignoring any legacy string IDs
  const userLikers = likers.filter(
    (liker) => typeof liker === "object"
  ) as UserSummary[];

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

        {userLikers.length === 0 ? (
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
