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
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline break-all"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </>
    );
};

export default Linkify;
