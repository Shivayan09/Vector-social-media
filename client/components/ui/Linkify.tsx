import React from "react";

interface LinkifyProps {
    text: string;
}

const Linkify: React.FC<LinkifyProps> = ({ text }) => {
    // Regex to detect URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;

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
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
};

export default Linkify;
