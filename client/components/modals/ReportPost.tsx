"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/useMounted";

type ReportPostProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string, note?: string) => void;
};

const REPORT_REASONS = [
  "Spam or misleading",
  "Hate speech or symbols",
  "Harassment or bullying",
  "Violence or threats",
  "Sexual content",
  "False information",
  "Other",
];

export default function ReportPost({ open, onClose, onSubmit }: ReportPostProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const mounted = useMounted();

  if (!mounted) return null;

  const closeModal = () => {
    onClose();
    setReason("");
    setNote("");
  };

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit(reason, note);
    toast.success("Post reported!");
    closeModal();
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={closeModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-[90%] max-w-md rounded-xl bg-white dark:bg-blue-950 border p-5 shadow-lg transform transition-all duration-200 ${
          open ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
        }`}
      >
        <h2 className="text-[1.2rem] font-semibold text-zinc-900 dark:text-white mb-3">
          Report post
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Tell us what&apos;s wrong with this post.
        </p>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full mb-3 text-[0.95rem] rounded-md border px-3 py-2 bg-white dark:bg-blue-950 text-zinc-900 dark:text-white"
        >
          <option value="">Select a reason</option>
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <textarea
          placeholder="Additional details (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-md border px-3 py-2 mb-4 resize-none text-zinc-900 dark:text-white"
        />

        <div className="flex justify-end gap-3 w-full text-zinc-900 dark:text-white">
          <button
            onClick={closeModal}
            className="w-1/2 py-1.5 rounded-md border text-sm hover:bg-black/5"
          >
            Cancel
          </button>

          <button
            disabled={!reason}
            onClick={handleSubmit}
            className={`w-1/2 py-1.5 rounded-md cursor-pointer text-white ${
              reason
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-blue-300 cursor-not-allowed"
            }`}
          >
            Submit report
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
