import { X, Search, UserPlus, UserCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";

interface SearchUser {
  _id: string;
  name: string;
  username: string;
  avatar: string;
  isFollowedByCurrentUser?: boolean;
  isRequestedByCurrentUser?: boolean;
}

interface SearchUsersModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchUsersModal({ open, onClose }: SearchUsersModalProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { userData } = useAppContext();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  useEffect(() => {
    if(!query){
      setUsers([]);
      return;
    }

    const delay = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${BACKEND_URL}/api/users/search?query=${query}`, {
          withCredentials: true,
        });
        setUsers(res.data.users || []);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query, BACKEND_URL]);

  const handleFollowToggle = async (userId: string, isFollowed: boolean) => {
    const updatedUsers = users.map((u) =>
      u._id === userId ? { ...u, isFollowedByCurrentUser: !isFollowed } : u
    );
    setUsers(updatedUsers);
    try {
      await axios.put(`${BACKEND_URL}/api/users/${userId}/follow`, {}, { withCredentials: true });
    } catch (error) {
      const revertUsers = users.map((u) =>
        u._id === userId ? { ...u, isFollowedByCurrentUser: isFollowed } : u
      );
      setUsers(revertUsers);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm">
      <div ref={modalRef} className="mt-16 w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold">Search Users</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 px-4 py-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          )}

          {!loading && users.length === 0 && query.length >= 2 && (
            <div className="py-8 text-center text-gray-500">No users found</div>
          )}

          {users.map((user) => (
            <div key={user._id} className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Link href={`/main/user/${user.username}`} onClick={onClose} className="flex flex-1 items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  {user.avatar ? (
                    <Image src={user.avatar} alt={user.name} width={40} height={40} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold">
                      {(user.name?.[0] || user.username[0]).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{user.name || user.username}</p>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
              </Link>

              {userData?._id !== user._id && (
                <button
                  onClick={() => handleFollowToggle(user._id, user.isFollowedByCurrentUser || false)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    user.isFollowedByCurrentUser
                      ? "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {user.isFollowedByCurrentUser ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
