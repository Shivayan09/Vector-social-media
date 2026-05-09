import axios from "axios";
import { useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";

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
      className={`w-25 md:w-30 h-9 rounded-md cursor-pointer transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
        following
          ? "border border-surface-border bg-surface-strong text-foreground hover:bg-surface-hover"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}>
      {following ? (
        <><UserCheck className="w-4 h-4" /> Following</>
      ) : (
        <><UserPlus className="w-4 h-4" /> Follow</>
      )}
    </button>
  );
}
