import axios from "axios";
import { useState } from "react";

type FollowButtonProps = {
  userId: string;
  isFollowing: boolean;
  onFollowChange?: (next: boolean) => void;
};

export default function FollowButton({ userId, isFollowing, onFollowChange }: FollowButtonProps) {

  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const toggleFollow = async () => {
    try {
      setLoading(true);
      const res = await axios.put(`${BACKEND_URL}/api/users/${userId}/follow`, {}, { withCredentials: true });
      const next = res.data.followed;
      setFollowing(next);
      onFollowChange?.(next);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      disabled={loading}
      onClick={toggleFollow}
      className={`w-25 md:w-30 h-9 rounded-md cursor-pointer transition-all duration-200 font-medium ${
        following
          ? "border text-white dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/2"
          : "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white"
      }`}>
      {following ? "Following" : "Follow"}
    </button>
  );
}
