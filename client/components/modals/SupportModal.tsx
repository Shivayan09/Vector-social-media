"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/useMounted";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/lib/error";

type SupportModalProps = {
  open: boolean;
  onClose: () => void;
  topic: string;
};

export default function SupportModal({ open, onClose, topic }: SupportModalProps) {
  const mounted = useMounted();
  const { userData } = useAppContext();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userData) {
      setName(userData.name || userData.username || "");
      setEmail(userData.email || "");
    }
  }, [userData, open]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      const res = await axios.post(`${BACKEND_URL}/api/contact`, {
        name: name.trim(),
        email: email.trim(),
        subject: topic,
        message: message.trim(),
      });

      if (res.data.success) {
        toast.success("Your issue has been submitted to the support team.");
        setMessage("");
        onClose();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to submit issue."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={isSubmitting ? undefined : onClose}
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-[90%] max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl transform transition-all duration-200 ${
          open ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-4 opacity-0"
        }`}
      >
        <div className="flex justify-between items-center mb-5 border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Support Request</h2>
            <p className="text-sm text-foreground/60 mt-1">{topic}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition disabled:opacity-50"
          >
            <X size={20} className="text-foreground/80" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none transition focus:border-primary disabled:opacity-50"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none transition focus:border-primary disabled:opacity-50"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Describe your issue</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary disabled:opacity-50"
              placeholder="Please provide as much detail as possible..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 w-full">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium rounded-xl border border-border bg-background hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-70 flex items-center justify-center min-w-30"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
