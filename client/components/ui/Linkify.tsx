import React from "react";
import Link from "next/link";

interface LinkifyProps {
    text: string;
}

const Linkify: React.FC<LinkifyProps> = ({ text }) => {
    // Regex to detect URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const mentionRegex = /(@[a-zA-Z0-9_]+)/g;

    const parts = text.split(urlRegex);

    return (
        <>
            {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    const punctuationMatch = part.match(/[.,;:\)]+$/);
                    const trailingPunctuation = punctuationMatch ? punctuationMatch[0] : "";
                    const urlString = part.slice(0, part.length - trailingPunctuation.length);

                    let isValidUrl = false;
                    try {
                        const parsedUrl = new URL(urlString);
                        if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
                            isValidUrl = true;
                        }
                    } catch {
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
                // Mention Hadling
                const mentionParts = part.split(mentionRegex);
                return (
                <React.Fragment key={index}>
                    {mentionParts.map((mentionPart, mentionIndex) => {
                        if (mentionPart.startsWith("@")) {
                            const username = mentionPart.slice(1);

                            return (
                                <Link
                                    key={`${index}-${mentionIndex}`}
                                    href={`/main/user/${username}`}
                                    className="text-blue-500 hover:underline font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {mentionPart}
                                </Link>
                            );
                        }

                        return (
                            <React.Fragment
                                key={`${index}-${mentionIndex}`}
                            >
                                {mentionPart}
                            </React.Fragment>
                        );
                    })}
                </React.Fragment>
            );
            })}
        </>
    );
};

export default Linkify;
