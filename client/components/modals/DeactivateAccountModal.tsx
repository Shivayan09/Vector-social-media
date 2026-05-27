"use client";

import { X, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";

export default function DeactivateAccountModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const [confirmed, setConfirmed] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30);
  const formattedDate = deletionDate.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleDeactivate = async () => {
    if (confirmed !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }
    try {
      setLoading(true);
      await axios.post(
        `${BACKEND_URL}/api/users/deactivate`,
        {},
        { withCredentials: true }
      );
      toast.info("Account deactivated. Log back in within 30 days to cancel.");
      router.push("/auth/login");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err)
          ? err.response?.data?.message
          : null;
      toast.error(message || "Failed to deactivate account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-background border border-border rounded-xl p-6 w-[90%] max-w-sm transition-all duration-200 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Delete Account</h2>
          </div>
          <button onClick={handleClose} className="cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Grace period info */}
        <div className="flex items-start gap-2 bg-accent/40 border border-border rounded-lg p-3 mb-3 text-sm text-foreground">
          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">30-day grace period</p>
            <p className="text-xs mt-0.5 opacity-90">
              Your account will be permanently deleted on{" "}
              <span className="font-semibold">{formattedDate}</span>.
              Log back in before then to cancel.
            </p>
          </div>
        </div>

        {/* What gets deleted */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-xs text-red-600 dark:text-red-400">
          <p className="font-medium mb-1">Permanently removes:</p>
          <ul className="list-disc list-inside space-y-0.5 opacity-90">
            <li>Your profile, posts and comments</li>
            <li>All messages and conversations</li>
            <li>Followers and following lists</li>
          </ul>
        </div>

        {/* Confirm input */}
        <label className="block text-sm font-medium mb-1">
          Type <span className="text-red-500 font-bold">DELETE</span> to confirm
        </label>
        <input
          type="text"
          value={confirmed}
          onChange={(e) => setConfirmed(e.target.value)}
          placeholder="DELETE"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-5 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
        />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" className="cursor-pointer" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleDeactivate}
            disabled={loading || confirmed !== "DELETE"}
            className="cursor-pointer bg-red-500 hover:bg-red-600 text-white border border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Delete Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}