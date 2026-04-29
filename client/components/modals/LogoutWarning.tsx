"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

export default function LogoutWarning({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleConfirm = () => {
    onConfirm();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className={`bg-white dark:bg-blue-950 border border-white/20 rounded-xl p-6 w-[90%] max-w-sm transition-all duration-200 ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Confirm logout</h2>
          <button onClick={handleClose} className="cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm opacity-70 mb-6">
          Are you sure you want to log out?
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="outline" className="cursor-pointer" onClick={handleClose}>
            Cancel
          </Button>
          <Button className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white" onClick={handleConfirm}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
