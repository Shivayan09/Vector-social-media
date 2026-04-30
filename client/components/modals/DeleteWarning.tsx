"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/useMounted";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
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

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
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
        }`}>
        <div className="flex justify-between items-center mb-4">
          <p className="text-[1.2rem] font-semibold">{title}</p>
          <button onClick={onClose} className="cursor-pointer">
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
          <button onClick={onClose} className="w-[50%] py-1.5 rounded-md border cursor-pointer hover:bg-black/5">
            Cancel
          </button>
          <button onClick={onConfirm} className="w-[50%] cursor-pointer py-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600">
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
