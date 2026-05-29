"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface LinkifyProps {
    text: string;
}

const Linkify: React.FC<LinkifyProps> = ({ text }) => {
    const router = useRouter();

    // Split on URLs and @mentions together
    const tokenRegex = /(https?:\/\/[^\s]+|@[a-zA-Z0-9_]{3,30})/g;
    const parts = text.split(tokenRegex);

    return (
        <>
            {parts.map((part, index) => {
                // ── @mention ──────────────────────────────────────────────
                if (/^@[a-zA-Z0-9_]{3,30}$/.test(part)) {
                    const username = part.slice(1);
                    return (
                        <span
                            key={index}
                            className="text-blue-500 hover:underline cursor-pointer font-medium"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/main/user/${username}`);
                            }}
                        >
                            {part}
                        </span>
                    );
                }

                // ── URL ───────────────────────────────────────────────────
                if (/^https?:\/\//.test(part)) {
                    const punctuationMatch = part.match(/[.,;:\)]+$/);
                    const trailingPunctuation = punctuationMatch ? punctuationMatch[0] : "";
                    const urlString = part.slice(0, part.length - trailingPunctuation.length);

                    let isValidUrl = false;
                    try {
                        const parsedUrl = new URL(urlString);
                        if (
                            parsedUrl.protocol === "http:" ||
                            parsedUrl.protocol === "https:"
                        ) {
                            isValidUrl = true;
                        }
                    } catch (_) {
                        // Ignore parsing errors
                    }

                    if (isValidUrl) {
                        return (
                            <React.Fragment key={index}>
                                <a
                                    href={urlString}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline break-all"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {urlString}
                                </a>
                                {trailingPunctuation}
                            </React.Fragment>
                        );
                    }
                }

                // ── Plain text ────────────────────────────────────────────
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
};

export default Linkify;
