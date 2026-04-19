"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isLoggedIn, loading } = useAppContext();

    useEffect(() => {
        if (!loading) {
            if (!isLoggedIn) {
                router.replace("/auth/login");
            }
        }
    }, [loading, isLoggedIn, router]);

    if (loading || !isLoggedIn) {
        return <p>Loading...</p>;
    }

    return <>{children}</>;
}
