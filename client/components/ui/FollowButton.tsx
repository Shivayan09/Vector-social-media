import axios from "axios";
import { useEffect, useState } from "react";

type FollowButtonProps = {
  userId: string;
  isFollowing: boolean;
  isFollowBack?: boolean;
  isRequested?: boolean;
  onFollowChange?: (next: boolean) => void;
};

export default function FollowButton({
  userId,
  isFollowing,
  isFollowBack,
  isRequested,
  onFollowChange
}: FollowButtonProps) {

  const [following, setFollowing] = useState(isFollowing);
  const [requested, setRequested] = useState(isRequested || false);
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  useEffect(() => {
    setRequested(isRequested || false);
  }, [isRequested]);

  const toggleFollow = async () => {
    try {
      setLoading(true);
      const res = await axios.put(`${BACKEND_URL}/api/users/${userId}/follow`, {}, { withCredentials: true });

      if (res.data.requested !== undefined) {
        setRequested(res.data.requested);
        setFollowing(false);
      } else {
        const next = res.data.followed;
        setFollowing(next);
        setRequested(false);
        onFollowChange?.(next);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return "...";
    if (following) return "Following";
    if (requested) return "Requested";
    if (isFollowBack) return "Follow Back";
    return "Follow";
  };

  return (
    <button
      disabled={loading}
      onClick={toggleFollow}
      className={`w-25 md:w-30 h-9 rounded-md cursor-pointer transition-all duration-200 font-medium ${following || requested
          ? "border-2 bg-black/10 text-(--text) hover:bg-black/5 dark:hover:bg-white/2"
          : "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white"
        }`}>
      {getButtonText()}
    </button>
  );
}
