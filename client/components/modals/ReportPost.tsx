"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/useMounted";
import axios from "axios";
import type { ReportReason } from "@/lib/types";

type ReportPostProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details?: string) => Promise<void>;
  targetLabel?: string;
};

const REPORT_REASONS = [
  { label: "Spam", value: "spam" },
  { label: "Harassment", value: "harassment" },
  { label: "Hate speech", value: "hate_speech" },
  { label: "Violence", value: "violence" },
  { label: "Nudity", value: "nudity" },
  { label: "Misinformation", value: "misinformation" },
  { label: "Other", value: "other" },
];

export default function ReportPost({
  open,
  onClose,
  onSubmit,
  targetLabel = "post",
}: ReportPostProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mounted = useMounted();

  if (!mounted) return null;

  const closeModal = () => {
    if (submitting) return;
    onClose();
    setReason("");
    setDetails("");
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    if (reason === "other" && !details.trim()) {
      toast.error("Please provide details for Other");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(reason, details.trim() || undefined);
      toast.success(`${targetLabel[0].toUpperCase()}${targetLabel.slice(1)} reported successfully`);
      closeModal();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.error(`You already reported this ${targetLabel}`);
      } else {
        toast.error("Failed to submit report");
      }
    } finally {
      setSubmitting(false);
    }
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
        <h2 className="text-[1.2rem] font-semibold text-blue-600 dark:text-white mb-3">
          Report {targetLabel}
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Tell us what&apos;s wrong with this {targetLabel}.
        </p>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason | "")}
          disabled={submitting}
          className="w-full mb-3 text-[0.95rem] rounded-md border px-3 py-2 bg-transparent dark:bg-blue-950"
        >
          <option value="">Select a reason</option>
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <textarea
          placeholder={reason === "other" ? "Additional details (required)" : "Additional details (optional)"}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          disabled={submitting}
          rows={3}
          className="w-full rounded-md border px-3 py-2 mb-4 resize-none"
        />

        <div className="flex justify-end gap-3 w-full">
          <button
            onClick={closeModal}
            disabled={submitting}
            className="w-1/2 py-1.5 rounded-md border text-sm hover:bg-black/5 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            disabled={!reason || submitting || (reason === "other" && !details.trim())}
            onClick={handleSubmit}
            className={`w-1/2 py-1.5 rounded-md cursor-pointer text-white ${
              reason && !submitting && !(reason === "other" && !details.trim())
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-blue-300 cursor-not-allowed"
            }`}
          >
            {submitting ? "Submitting..." : "Submit report"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
