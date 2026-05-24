"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/useMounted";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>; // Updated to support async operations
  title?: string;
  description?: string;
  confirmText?: string;
  content?: string;
};

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Delete",
  content,
}: ConfirmModalProps) {
  const mounted = useMounted();
  const [isDeleting, setIsDeleting] = useState(false); // Tracks if delete API is active

  const handleConfirm = async () => {
    try {
      setIsDeleting(true); // Turn on loading state
      await onConfirm(); // Wait for backend request to finish
      onClose(); // Only close modal window on success
    } catch (error) {
      console.error("Error during deletion execution:", error);
    } finally {
      setIsDeleting(false); // Turn off loading state
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={isDeleting ? undefined : onClose} // Block background click if deleting
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
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
          <p className="text-[1.2rem] font-semibold">{title}</p>
          <button 
            onClick={onClose} 
            disabled={isDeleting} // Disable X button when loading
            className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {description}
        </p>

        {content && (
          <div className="border rounded-md p-3 text-sm max-h-30 overflow-y-auto bg-gray-50 dark:bg-blue-900 my-5">
            {content}
          </div>
        )}

        <div className="flex justify-end gap-3 w-full">
          <button 
            onClick={onClose} 
            disabled={isDeleting} // Disable cancel button when loading
            className="w-[50%] py-1.5 rounded-md border cursor-pointer hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} // Route click to custom handler
            disabled={isDeleting} // Disable action button when loading
            className="w-[50%] cursor-pointer py-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isDeleting ? "Deleting..." : confirmText} {/* Toggle dynamic button text */}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}