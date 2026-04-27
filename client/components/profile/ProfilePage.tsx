"use client";

import { useAppContext } from "@/context/AppContext";
import ProfileLayout from "@/components/profile/ProfileLayout";
import SkeletonLoader from "@/components/loaders/SkeletonLoader";

export default function ProfilePage() {
  const { userData, loading } = useAppContext();

  if (loading) return <div className="p-10"><SkeletonLoader count={1} height="h-64" /></div>;
  if (!userData) return <p className="p-10">Not logged in</p>;

  return (
    <ProfileLayout user={userData}/>
  );
}
