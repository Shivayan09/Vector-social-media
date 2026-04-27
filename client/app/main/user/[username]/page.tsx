"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAppContext } from "@/context/AppContext";
import ProfileLayout from "@/components/profile/ProfileLayout";
import SkeletonLoader from "@/components/loaders/SkeletonLoader";

export default function UserProfilePage() {
  const params = useParams();
  const username = typeof params.username === "string" ? params.username : undefined;
  const { userData } = useAppContext();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  useEffect(() => {
    if (!username) return;
    const fetchUser = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${BACKEND_URL}/api/users/${username}`, { withCredentials: true });
        setUser(data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username]);

  if (!username) {
    return <div className="p-10"><SkeletonLoader count={1} height="h-64" /></div>;
  }

  if (loading) {
    return <div className="p-10"><SkeletonLoader count={1} height="h-64" /></div>;
  }

  if (!user) {
    return <p className="p-10">User not found, please reload the page and click on profile again</p>;
  }

  const isFollowing = userData && Array.isArray(user.followers) && user.followers.includes(userData.id);

  return (
    <ProfileLayout
      user={user}
      isFollowing={isFollowing}
    />
  );
}
