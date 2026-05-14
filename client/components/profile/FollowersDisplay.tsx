"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import UserRow from "./UserRow";
import SkeletonLoader from "../loaders/SkeletonLoader";
import FollowListModal from "../modals/FollowListModal";
import type { UserSummary } from "@/lib/types";

const DISPLAY_LIMIT = 5;

type Props = {
    userId: string;
    emptyText?: string;
};

export default function FollowersDisplay({ userId, emptyText }: Props) {
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
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
    }, [BACKEND_URL, userId]);

    if (loading) return <div className="mt-6"><SkeletonLoader count={3} height="h-16" /></div>;

    if (users.length === 0) {
        return <p className="text-center text-gray-500 mt-6">{emptyText}</p>;
    }

    const visibleUsers = users.slice(0, DISPLAY_LIMIT);
    const hasMore = users.length > DISPLAY_LIMIT;

    return (
        <>
            <div className="flex flex-col gap-3">
                {visibleUsers.map(user => (
                    <UserRow key={user._id} user={user} />
                ))}
            </div>

            {hasMore && (
                <button
                    onClick={() => setModalOpen(true)}
                    className="mt-4 w-full py-2 rounded-md text-sm font-semibold text-blue-500 hover:bg-blue-500/10 transition cursor-pointer"
                >
                    Load more ({users.length - DISPLAY_LIMIT} more)
                </button>
            )}

            <FollowListModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                users={users}
                title={`${users.length} ${users.length === 1 ? "Follower" : "Followers"}`}
            />
        </>
    );
}
