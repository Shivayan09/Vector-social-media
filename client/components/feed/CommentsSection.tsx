"use client";

import axios from "axios";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Flag, MoreHorizontal, Trash2, AlertCircle } from "lucide-react";
import DeleteWarning from "@/components/modals/DeleteWarning";
import InlineLoader from "../loaders/InlineLoader";
import type { Comment } from "@/lib/types";
import ReportPost from "../modals/ReportPost";
import type { ReportReason } from "@/lib/types";
import { reportComment } from "@/lib/reportApi";
import Linkify from "../ui/Linkify";

type MentionUser = {
    _id: string;
    username: string;
    name: string;
    avatar?: string;
};

export default function CommentsSection({ postId }: { postId: string }) {
    const { userData } = useAppContext();
    const [comments, setComments] = useState<Comment[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const [buttonLoading, setButtonLoading] = useState(false);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 20;

    // ── Mention autocomplete state ─────────────────────────────────────────
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
    const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // ──────────────────────────────────────────────────────────────────────

    function timeAgo(dateString: string) {
        const now = new Date().getTime();
        const past = new Date(dateString).getTime();
        const diff = Math.floor((now - past) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const fetchComments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(
                `${BACKEND_URL}/api/comments/${postId}?limit=${LIMIT}`,
                { withCredentials: true }
            );
            setComments(data.comments);
            setHasMore(data.hasMore);
            setCursor(data.nextCursor);
        } catch (err: unknown) {
            console.error("Error fetching comments:", err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message || "Failed to load comments.");
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load comments.");
            }
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL, postId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const loadMoreComments = async () => {
        setLoadMoreLoading(true);
        setLoadMoreError(false);
        try {
            const { data } = await axios.get(
                `${BACKEND_URL}/api/comments/${postId}?cursor=${cursor}&limit=${LIMIT}`,
                { withCredentials: true }
            );
            setComments(prev => [...prev, ...data.comments]);
            setHasMore(data.hasMore);
            setCursor(data.nextCursor);
        } catch (err: unknown) {
            console.error("Error loading more comments:", err);
            setLoadMoreError(true);
            if (err instanceof Error) {
                toast.error(`Failed to load more comments: ${err.message}`);
            } else {
                toast.error("Failed to load more comments.");
            }
        } finally {
            setLoadMoreLoading(false);
        }
    };

    // ── Mention handlers ───────────────────────────────────────────────────

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setText(val);

        // Detect an @query being typed at the current cursor position
        const cursorPos = e.target.selectionStart ?? val.length;
        const textUpToCursor = val.slice(0, cursorPos);
        const match = textUpToCursor.match(/@([a-zA-Z0-9_]*)$/);

        if (match) {
            const query = match[1];
            setMentionQuery(query);

            if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);

            mentionDebounceRef.current = setTimeout(async () => {
                if (query.length === 0) {
                    setMentionResults([]);
                    return;
                }
                try {
                    const { data } = await axios.get(
                        `${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}&limit=5`,
                        { withCredentials: true }
                    );
                    // /api/users/search returns { users: [...] } or a plain array
                    setMentionResults(data.users ?? data ?? []);
                } catch {
                    setMentionResults([]);
                }
            }, 250);
        } else {
            setMentionQuery(null);
            setMentionResults([]);
        }
    };

    const insertMention = (username: string) => {
        // Replace the trailing @partial with the full @username + space
        const newText = text.replace(/@([a-zA-Z0-9_]*)$/, `@${username} `);
        setText(newText);
        setMentionQuery(null);
        setMentionResults([]);
    };

    // ──────────────────────────────────────────────────────────────────────

    const handlePost = async () => {
        try {
            setButtonLoading(true);
            const { data } = await axios.post(
                `${BACKEND_URL}/api/comments/${postId}`,
                { content: text },
                { withCredentials: true }
            );
            setComments(prev => [data, ...prev]);
            setText("");
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Failed to post comment");
            }
        } finally {
            setButtonLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // If the mention dropdown is open, don't submit on Enter — let the
        // user pick from the dropdown with mouse/keyboard instead.
        if (mentionQuery !== null && mentionResults.length > 0) return;

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (text.trim() && !buttonLoading) {
                handlePost();
            }
        }
    };

    const handleDeleteComment = async () => {
        if (!selectedComment) return;
        try {
            await axios.delete(
                `${BACKEND_URL}/api/comments/${selectedComment._id}`,
                { withCredentials: true }
            );
            setComments(prev => prev.filter(c => c._id !== selectedComment._id));
            toast.success("Comment deleted");
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Failed to delete comment");
            }
        } finally {
            setShowDeleteModal(false);
            setSelectedComment(null);
        }
    };

    const handleReportComment = async (reason: ReportReason, details?: string) => {
        if (!selectedComment?._id) return;
        await reportComment(selectedComment._id, reason, details);
        setMenuOpenId(null);
    };

    if (loading) {
        return <div className="py-2"><InlineLoader text="Loading comments..." /></div>;
    }

    if (error) {
        return (
            <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-red-500/30 bg-red-500/5 py-8 px-4 text-center">
                <AlertCircle className="mb-2 h-10 w-10 text-red-500 opacity-80" />
                <p className="text-[0.9rem] font-medium text-red-500 mb-4">
                    {error}
                </p>
                <button
                    onClick={fetchComments}
                    className="cursor-pointer px-4 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all text-white text-xs font-semibold rounded-md shadow-md hover:shadow-lg"
                >
                    Retry loading comments
                </button>
            </div>
        );
    }

    return (
        <div className="mt-3 rounded-b-xl px-3 pt-4 pb-5 md:px-5">
            <p className="text-[0.8rem] font-semibold uppercase tracking-wide surface-text-muted mb-4">
                Comments {comments.length > 0 && `· ${comments.length}`}
            </p>

            {userData && (
                <div className="flex gap-2 mb-5">
                    {/* Textarea wrapper — position:relative so the dropdown anchors to it */}
                    <div className="flex-1 relative">
                        <textarea
                            value={text}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Write a comment.. (use @ to mention someone)"
                            className="form-textarea mt-0 w-full"
                            rows={2}
                        />

                        {/* ── Mention autocomplete dropdown ── */}
                        {mentionQuery !== null && mentionResults.length > 0 && (
                            <div className="absolute left-0 bottom-full mb-1 z-30 w-64 rounded-md border border-black/10 bg-white dark:bg-blue-950 dark:border-white/10 shadow-lg overflow-hidden">
                                {mentionResults.map((u) => (
                                    <button
                                        key={u._id}
                                        type="button"
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left"
                                        // onMouseDown so we don't lose textarea focus before inserting
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            insertMention(u.username);
                                        }}
                                    >
                                        <img
                                            src={u.avatar || "/default-avatar.png"}
                                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                            alt={u.name}
                                        />
                                        <span className="font-medium text-foreground truncate">
                                            {u.name}
                                        </span>
                                        <span className="text-gray-400 text-xs ml-auto flex-shrink-0">
                                            @{u.username}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* ─────────────────────────────────── */}
                    </div>

                    <button
                        disabled={!text.trim() || buttonLoading}
                        onClick={handlePost}
                        className="w-20 md:w-25 h-9 md:h-10 cursor-pointer bg-blue-500 text-white text-sm font-medium rounded-md disabled:opacity-50 self-end"
                    >
                        Post
                    </button>
                </div>
            )}

            <div className="flex flex-col">
                {comments.length === 0 && (
                    <p className="surface-text-muted py-3 text-center text-[0.9rem]">
                        No comments yet!
                    </p>
                )}

                {comments.map((c) => {
                    const isOwner = String(c.author?._id) === String(userData?.id);

                    return (
                        <div
                            key={c._id}
                            className="flex gap-3 py-3 px-2 rounded-lg border-b border-border/50 last:border-b-0"
                        >
                            <Image
                                alt={c.author?.name || "Comment author"}
                                src={c.author?.avatar || "/default-avatar.png"}
                                width={36}
                                height={36}
                                className="h-8 w-8 md:h-9 md:w-9 object-cover rounded-full shrink-0"
                            />

                            <div className="flex flex-col w-full">
                                <div className="flex items-center gap-2">
                                    <p
                                        className="cursor-pointer text-[0.9rem] font-semibold text-foreground"
                                        onClick={() =>
                                            router.push(`/main/user/${c.author?.username}`)
                                        }
                                    >
                                        {c.author?.name}
                                    </p>

                                    <div className="ml-auto relative">
                                        <button
                                            type="button"
                                            className="surface-text-muted cursor-pointer"
                                            onClick={() => {
                                                setMenuOpenId(prev =>
                                                    prev === c._id ? null : c._id
                                                );
                                            }}
                                        >
                                            <MoreHorizontal size={16} />
                                        </button>

                                        {menuOpenId === c._id && (
                                            <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-md border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-blue-950">
                                                {!isOwner && (
                                                    <button
                                                        type="button"
                                                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-black/3 dark:hover:bg-white/5"
                                                        onClick={() => {
                                                            setSelectedComment(c);
                                                            setShowReportModal(true);
                                                            setMenuOpenId(null);
                                                        }}
                                                    >
                                                        <Flag size={14} />
                                                        Report comment
                                                    </button>
                                                )}

                                                {isOwner && (
                                                    <button
                                                        type="button"
                                                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-black/3 dark:hover:bg-white/5"
                                                        onClick={() => {
                                                            setSelectedComment(c);
                                                            setShowDeleteModal(true);
                                                            setMenuOpenId(null);
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete comment
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Linkify renders @mentions as clickable links */}
                                <div className="surface-text-muted text-[0.9rem] whitespace-pre-wrap break-words">
                                    <Linkify text={c?.content || ""} />
                                </div>

                                <p className="text-[0.75rem] text-gray-500 mt-1">
                                    {timeAgo(c.createdAt)}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {hasMore && (
                    <div className="mt-3 text-center">
                        {loadMoreLoading ? (
                            <InlineLoader text="Loading more comments..." />
                        ) : loadMoreError ? (
                            <div className="flex flex-col items-center gap-1.5 py-2">
                                <p className="text-sm text-red-500 font-medium">
                                    Failed to load more comments.
                                </p>
                                <button
                                    onClick={loadMoreComments}
                                    className="cursor-pointer text-xs text-blue-500 hover:underline font-semibold"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={loadMoreComments}
                                className="w-full py-2 text-sm text-blue-500 hover:text-blue-600 hover:bg-black/3 dark:hover:bg-white/5 rounded-md font-medium transition cursor-pointer"
                            >
                                Load more comments
                            </button>
                        )}
                    </div>
                )}
            </div>

            <DeleteWarning
                open={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedComment(null);
                }}
                onConfirm={handleDeleteComment}
                content={selectedComment?.content}
            />

            <ReportPost
                open={showReportModal}
                onClose={() => {
                    setShowReportModal(false);
                    setSelectedComment(null);
                }}
                onSubmit={handleReportComment}
                targetLabel="comment"
            />
        </div>
    );
}
