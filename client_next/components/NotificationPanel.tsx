"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Trash, Trash2 } from "lucide-react";

type Notification = {
  _id: string;
  type: "follow" | "like" | "comment";
  sender: {
    _id: string;
    username: string;
    name: string;
    avatar?: string;
  };
  post?: {
    _id: string;
  };
  isRead: boolean;
  createdAt: string;
};

export default function NotificationPanel() {
  const { userData } = useAppContext();
  const router = useRouter();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${BACKEND_URL}/api/notifications`, { withCredentials: true });
      setNotifications(data);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to fetch notifications"
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteSingle = async (id: string) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/notifications/${id}`, { withCredentials: true });
      setNotifications(prev =>
        prev.filter(n => n._id !== id)
      );
      toast.success("Notification deleted");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Delete failed"
      );
    }
  };

  const deleteSelected = async () => {
    if (selected.length === 0) return;
    try {
      await axios.post(`${BACKEND_URL}/api/notifications/bulk-delete`, { ids: selected }, { withCredentials: true });
      setNotifications(prev =>
        prev.filter(n => !selected.includes(n._id))
      );
      setSelected([]);
      setSelectMode(false);

      toast.success("Selected notifications deleted");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Bulk delete failed"
      );
    }
  };

  const deleteAll = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/api/notifications/all`, { withCredentials: true });
      setNotifications([]);
      setSelected([]);
      setSelectMode(false);
      toast.success("All notifications cleared");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Delete all failed"
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n => axios.put(`${BACKEND_URL}/api/notifications/${n._id}/read`, {}, { withCredentials: true })));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (userData) {
      fetchNotifications();
    }
  }, [userData]);

  useEffect(() => {
    if (notifications.some(n => !n.isRead)) {
      markAllAsRead();
    }
  }, [notifications.length]);

  if (!userData) {
    return null;
  }

  return (
    <div className="w-full mt-5">

      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-3 md:gap-0">
        <p className="font-semibold text-lg text-white">Notifications</p>
        <div className="flex gap-2">
          {selectMode && selected.length > 0 && (
            <button onClick={deleteSelected} className="h-9 text-sm w-35 cursor-pointer bg-blue-600 text-white rounded-md">
              Delete Selected
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={deleteAll} className="h-9 text-sm cursor-pointer w-[50%] md:w-25 py-1 bg-blue-600 text-white rounded-md">
              Clear All
            </button>
          )}
          {notifications.length> 0 &&(
            <button
            onClick={() => {
              setSelectMode(prev => !prev);
              setSelected([]);
            }}
            className="h-9 text-sm cursor-pointer w-[50%] md:w-25 rounded-md bg-blue-600 text-white">
            {selectMode ? "Cancel" : "Select"}
          </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">
          Loading notifications...
        </p>
      ) : notifications.length === 0 ? (
        <p className="text-gray-600 text-sm">
          No notifications yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map(n => (
            <div key={n._id} className={`flex items-center gap-3 p-4 rounded-xl transition ${!n.isRead ? "backdrop-blur-lg" : "backdrop-blur-3xl"}`}>
              {selectMode && (
                <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={selected.includes(n._id)}
                  onChange={() => {setSelected(prev => prev.includes(n._id) ? prev.filter(id => id !== n._id) : [...prev, n._id])}} />)}
              <div
                onClick={() => {
                  if (!selectMode) {
                    if (n.post?._id) {
                      router.push(`/main/post/${n.post._id}`);
                    } else {
                      router.push(`/main/user/${n.sender.username}`);
                    }
                  }
                }}
                className="flex gap-3 flex-1 cursor-pointer p-2 rounded-lg">
                <img src={n.sender.avatar || "/default-avatar.png"} className="h-10 w-10 rounded-full object-cover" />
                <div className="text-sm">
                  <p className="text-white">
                    <span className="font-semibold">
                      {n.sender.name}
                    </span>{" "}
                    {n.type === "follow" &&
                      "followed you"}
                    {n.type === "like" &&
                      "liked your post"}
                    {n.type === "comment" &&
                      "commented on your post"}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!selectMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSingle(n._id);
                    }}
                    className="text-white ml-auto">
                    <Trash2 className="h-5 cursor-pointer" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
