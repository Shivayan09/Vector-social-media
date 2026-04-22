"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import UserRow from "./UserRow";

type Props = {
    userId: string;
    emptyText?: string;
};

export default function FollowingDisplay({ userId, emptyText }: Props) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    useEffect(() => {
        const fetchFollowing = async () => {
            try {
                const { data } = await axios.get(`${BACKEND_URL}/api/users/${userId}/following`, { withCredentials: true });
                setUsers(data);
            } finally {
                setLoading(false);
            }
        };
        fetchFollowing();
    }, [userId]);

    if (loading) return <p className="text-center mt-6 neo-text">Loading...</p>;

    if (users.length === 0) {
        return <p className="text-center neo-foreground-muted mt-6">{emptyText}</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            {users.map(user => (
                <UserRow key={user._id} user={user} />
            ))}
        </div>
    );
}
