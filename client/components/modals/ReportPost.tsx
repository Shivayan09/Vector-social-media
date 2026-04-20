"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";

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
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  if (!mounted) return null;

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => {
      onClose();
      setReason("");
      setNote("");
    }, 200);
  };

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit(reason, note);
    toast.success("Post reported!");
    closeModal();
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/60 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={closeModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`neo-shell w-[90%] max-w-md p-5 transform transition-all duration-200 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
        }`}
      >
        <h2 className="text-[1.2rem] font-semibold text-blue-600 dark:text-white mb-3">
          Report post
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Tell us what's wrong with this post.
        </p>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="neo-select w-full mb-3 text-[0.95rem] rounded-md px-3 py-2"
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
          className="neo-textarea w-full rounded-md px-3 py-2 mb-4"
        />

        <div className="flex justify-end gap-3 w-full">
          <button
            onClick={closeModal}
            className="neo-button-secondary w-1/2 py-1.5 rounded-md text-sm"
          >
            Cancel
          </button>

          <button
            disabled={!reason}
            onClick={handleSubmit}
            className="neo-button w-1/2 py-1.5 rounded-md cursor-pointer text-white"
          >
            Submit report
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}