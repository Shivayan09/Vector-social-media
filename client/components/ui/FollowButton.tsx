import axios from "axios";
import { useState, useEffect } from "react";

type FollowButtonProps = {
  userId: string;
  isFollowing: boolean;
  onFollowChange?: (next: boolean) => void;
};

export default function FollowButton({ userId, isFollowing, onFollowChange }: FollowButtonProps) {

  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  const toggleFollow = async () => {
    try {
      setLoading(true);
      const res = await axios.put(`${BACKEND_URL}/api/users/${userId}/follow`, {}, { withCredentials: true });
      const next = res.data.followed;
      setFollowing(next);
      onFollowChange?.(next);
    } catch (err: any) {
      console.error(err.message);
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
          ? "border border-blue-500 neo-text hover:bg-blue-500/10"
          : "neo-button"
      }`}>
      {following ? "Following" : "Follow"}
    </button>
  );
}