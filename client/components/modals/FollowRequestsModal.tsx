import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserSummary } from "@/lib/types";
import { useAppContext } from "@/context/AppContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function FollowRequestsModal({ open, onClose }: Props) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { userData, setUserData } = useAppContext();
  const [requests, setRequests] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${BACKEND_URL}/api/users/follow-requests`, {
        withCredentials: true,
      });
      setRequests(data);
    } catch {
      toast.error("Failed to fetch follow requests");
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open, fetchRequests]);

  const handleAccept = async (id: string) => {
    try {
      await axios.put(`${BACKEND_URL}/api/users/${id}/accept-request`, {}, { withCredentials: true });
      setRequests((prev) => prev.filter((r) => r._id !== id));
      toast.success("Follow request accepted");
      if (userData) {
        setUserData({
            ...userData,
            followRequests: userData.followRequests?.filter((rId) => rId !== id)
        });
      }
    } catch {
      toast.error("Failed to accept request");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await axios.put(`${BACKEND_URL}/api/users/${id}/reject-request`, {}, { withCredentials: true });
      setRequests((prev) => prev.filter((r) => r._id !== id));
      toast.success("Follow request rejected");
      if (userData) {
        setUserData({
            ...userData,
            followRequests: userData.followRequests?.filter((rId) => rId !== id)
        });
      }
    } catch {
      toast.error("Failed to reject request");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl border border-border"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Follow Requests</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground my-8">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground my-8">No pending follow requests.</p>
        ) : (
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {requests.map((reqUser) => (
              <div key={reqUser._id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50">
                <div className="flex items-center gap-3">
                  <img
                    src={reqUser.avatar || "/default-avatar.png"}
                    alt={reqUser.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-sm text-foreground">{reqUser.name}</p>
                    <p className="text-xs text-muted-foreground">@{reqUser.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(reqUser._id)}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(reqUser._id)}
                    className="px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-md hover:bg-secondary-foreground/10 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
