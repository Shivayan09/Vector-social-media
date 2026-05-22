"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { MutualFollower } from "@/lib/types";

type Props = {
    mutualFollowers: MutualFollower[];
    mutualFollowersCount: number;
};

export default function MutualFollowersBar({ mutualFollowers, mutualFollowersCount }: Props) {
    const router = useRouter();

    if (!mutualFollowers || mutualFollowers.length === 0) return null;

    // Show ALL names the backend returned (capped at 3 server-side)
    // "rest" = remaining mutuals that have no populated name to display
    const rest = mutualFollowersCount - mutualFollowers.length;

    return (
        <div className="flex items-center gap-2 mt-2">

            {/* Stacked avatar thumbnails — all populated mutuals */}
            <div className="flex -space-x-2 shrink-0">
                {mutualFollowers.map((u) => (
                    <Image
                        key={u._id}
                        src={u.avatar || "/default-avatar.png"}
                        alt={u.name}
                        width={24}
                        height={24}
                        title={`@${u.username}`}
                        onClick={() => router.push(`/main/user/${u.username}`)}
                        className="h-6 w-6 rounded-full border-2 border-background object-cover cursor-pointer hover:scale-110 transition-transform"
                    />
                ))}
            </div>

            {/*
              Renders grammatically correct lists:
              - "Followed by alice"
              - "Followed by alice and bob"
              - "Followed by alice, bob and charlie"
              - "Followed by alice, bob, charlie and 2 others you follow"
            */}
            <div className="text-xs surface-text-muted leading-snug">
                <span>Followed by </span>
                {mutualFollowers.map((u, i) => {
                    const isLast = i === mutualFollowers.length - 1;
                    const isSecondToLast = i === mutualFollowers.length - 2;
                    
                    let separator = "";
                    if (!isLast) {
                        if (rest === 0 && isSecondToLast) {
                            separator = " and ";
                        } else {
                            separator = ", ";
                        }
                    }

                    return (
                        <span key={u._id}>
                            <button
                                onClick={() => router.push(`/main/user/${u.username}`)}
                                className="font-semibold text-foreground hover:underline cursor-pointer"
                            >
                                {u.name}
                            </button>
                            {separator}
                        </span>
                    );
                })}

                {/* "and N others you follow" when there are still more not named */}
                {rest > 0 && (
                    <span>
                        {" and "}
                        <span className="font-semibold text-foreground">
                            {rest} other{rest > 1 ? "s" : ""}
                        </span>
                        {" you follow"}
                    </span>
                )}
            </div>
        </div>
    );
}
