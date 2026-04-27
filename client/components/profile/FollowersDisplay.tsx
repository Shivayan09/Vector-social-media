"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import UserRow from "./UserRow";
import SkeletonLoader from "../loaders/SkeletonLoader";

type Props = {
    userId: string;
    emptyText?: string;
};

export default function FollowersDisplay({ userId, emptyText }: Props) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        const fetchFollowers = async () => {
            try {
                const { data } = await axios.get(`${BACKEND_URL}/api/users/${userId}/followers`, { withCredentials: true });
                setUsers(data);
            } finally {
                setLoading(false);
            }
        };
        fetchFollowers();
    }, [userId]);

    if (loading) return <div className="mt-6"><SkeletonLoader count={3} height="h-16" /></div>;

    if (users.length === 0) {
        return <p className="text-center text-gray-500 mt-6">{emptyText}</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            {users.map(user => (
                <UserRow key={user._id} user={user} />
            ))}
        </div>
    );
}