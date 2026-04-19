"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ProtectedLayout - Client-side route protection wrapper
 * Ensures only authenticated users can access protected content
 */
export default function ProtectedLayout({
  children,
  fallback,
}: ProtectedLayoutProps) {
  const router = useRouter();
  const { isLoggedIn, loading } = useAppContext();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return; // Still loading auth state

    // Check authentication
    if (!isLoggedIn) {
      router.replace("/auth/login");
      return;
    }

    // User is authorized
    setIsAuthorized(true);
  }, [loading, isLoggedIn, router]);

  // Show fallback while loading
  if (loading || !isAuthorized) {
    return fallback || <p className="text-center py-10">Loading...</p>;
  }

  return <>{children}</>;
}