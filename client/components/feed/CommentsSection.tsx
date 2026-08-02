"use client";

import axios from "axios";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/lib/error";
import { Flag, MoreHorizontal, Trash2, AlertCircle, Edit2 } from "lucide-react";
import DeleteWarning from "@/components/modals/DeleteWarning";
import InlineLoader from "../loaders/InlineLoader";
import type { Comment } from "@/lib/types";
import ReportPost from "../modals/ReportPost";
import type { ReportReason } from "@/lib/types";
import { reportComment } from "@/lib/reportApi";
import Linkify from "../ui/Linkify";

type MentionedUser = {
_id: string;
username: string;
avatar?: string;
};

export default function CommentsSection({ postId, postAuthorId }: { postId: string; postAuthorId?: string }) {
    const { userData } = useAppContext();
    const [comments, setComments] = useState<Comment[]>([]);
    const [text, setText] = useState("");
    const [mentionQuery, setMentionQuery] = useState("");
    const [suggestions, setSuggestions] = useState<MentionedUser[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
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
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    const LIMIT = 20;

    function timeAgo(dateString: string) {
        const now = Date.now();
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
            const { data } = await axios.get(`${BACKEND_URL}/api/comments/${postId}?limit=${LIMIT}`, { withCredentials: true });
            setComments(data.comments);
            setHasMore(data.hasMore);
            setCursor(data.nextCursor);
        } catch (err: unknown) {
            console.error("Error fetching comments:", err);
            setError(getErrorMessage(err, "Failed to load comments."));
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
            const { data } = await axios.get(`${BACKEND_URL}/api/comments/${postId}?cursor=${cursor}&limit=${LIMIT}`, { withCredentials: true });
            setComments(prev => [...prev, ...data.comments]);
            setHasMore(data.hasMore);
            setCursor(data.nextCursor);
        } catch (err: unknown) {
            console.error("Error loading more comments:", err);
            setLoadMoreError(true);
            toast.error(getErrorMessage(err, "Failed to load more comments."));
        } finally {
            setLoadMoreLoading(false);
        }
    };

    const handlePost = async () => {
        try {
            setButtonLoading(true);
            const payload = {
                content: text,
                parentCommentId: replyingTo ? replyingTo._id : undefined
            };
            const { data } = await axios.post(`${BACKEND_URL}/api/comments/${postId}`, payload, { withCredentials: true });
            if (replyingTo) {
                setComments(prev => prev.map(c => {
                    if (c._id === replyingTo._id) {
                        return {
                            ...c,
                            replies: [...(c.replies || []), data]
                        };
                    }
                    return c;
                }));
                setReplyingTo(null);
            } else {
                setComments(prev => [data, ...prev]);
            }
            setText("");
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to post comment"));
        } finally {
            setButtonLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
            await axios.delete(`${BACKEND_URL}/api/comments/${selectedComment._id}`, { withCredentials: true });
            if (selectedComment.parentCommentId) {
                setComments(prev => prev.map(c => {
                    if (c._id === selectedComment.parentCommentId) {
                        return {
                            ...c,
                            replies: (c.replies || []).filter(r => r._id !== selectedComment._id)
                        };
                    }
                    return c;
                }));
            } else {
                setComments(prev => prev.filter(c => c._id !== selectedComment._id));
            }
            toast.success("Comment deleted");
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to delete comment"));
        } finally {
            setShowDeleteModal(false);
            setSelectedComment(null);
        }
    };

    const handleEditSubmit = async (commentId: string) => {
        try {
            setEditLoading(true);
            const { data } = await axios.put(`${BACKEND_URL}/api/comments/${commentId}`, { content: editContent }, { withCredentials: true });
            
            setComments(prev => prev.map(c => {
                if (c._id === commentId) return data.comment;
                if (c.replies) {
                    const replyIndex = c.replies.findIndex(r => r._id === commentId);
                    if (replyIndex !== -1) {
                        const newReplies = [...c.replies];
                        newReplies[replyIndex] = data.comment;
                        return { ...c, replies: newReplies };
                    }
                }
                return c;
            }));
            
            setEditingCommentId(null);
            setEditContent("");
            toast.success("Comment updated");
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to edit comment"));
        } finally {
            setEditLoading(false);
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

    const renderCommentCard = (c: Comment, parentComment?: Comment) => {
        const isCommentAuthor =
            String(c.author?._id) === String(userData?._id);
        const isPostAuthor =
            postAuthorId && String(postAuthorId) === String(userData?._id);
        const canDelete = isCommentAuthor || isPostAuthor;

        return (
            <div className="flex gap-3 py-3 px-2 rounded-lg border-b border-border/50 last:border-b-0">
                <Image alt={c.author?.name || "Comment author"} src={c.author?.avatar || "/default-avatar.png"} width={36} height={36} className="h-8 w-8 md:h-9 md:w-9 object-cover rounded-full shrink-0" />

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
                                    setMenuOpenId((prev) => (prev === c._id ? null : c._id));
                                }}
                            >
                                <MoreHorizontal size={16} />
                            </button>

                            {menuOpenId === c._id && (
                                <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-md border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-blue-950">
                                    {!isCommentAuthor && (
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

                                    {isCommentAuthor && (
                                        <button
                                            type="button"
                                            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-black/3 dark:hover:bg-white/5"
                                            onClick={() => {
                                                setEditingCommentId(c._id);
                                                setEditContent(c.content);
                                                setMenuOpenId(null);
                                            }}
                                        >
                                            <Edit2 size={14} />
                                            Edit comment
                                        </button>
                                    )}

                                    {canDelete && (
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

                    {editingCommentId === c._id ? (
                        <div className="mt-2 flex flex-col gap-2">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="form-textarea w-full text-[0.9rem] min-h-[60px]"
                                autoFocus
                            />
                            <div className="flex items-center gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCommentId(null);
                                        setEditContent("");
                                    }}
                                    className="text-xs font-semibold text-gray-500 hover:text-foreground cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleEditSubmit(c._id)}
                                    disabled={editLoading || !editContent.trim()}
                                    className="text-xs font-semibold px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editLoading ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="surface-text-muted text-[0.9rem] whitespace-pre-wrap wrap-break-word">
                            <Linkify text={c?.content || ""} />
                        </div>
                    )}

                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-[0.75rem] text-gray-500 flex items-center gap-1">
                            {timeAgo(c.createdAt)}
                            {c.isEdited && <span className="opacity-60 font-medium">(edited)</span>}
                        </p>
                        {userData && (
                            <button
                                type="button"
                                className="text-[0.75rem] font-semibold text-blue-500 cursor-pointer hover:underline"
                                onClick={() => {
                                    setReplyingTo(parentComment || c);
                                    if (parentComment) {
                                        setText(`@${c.author?.username} `);
                                    }
                                }}
                            >
                                Reply
                            </button>
                        )}
                    </div>

                </div>
            </div>
        );
    };

    return (
        <div className="mt-3 rounded-b-xl px-3 pt-4 pb-5 md:px-5">
            <p className="text-[0.8rem] font-semibold uppercase tracking-wide surface-text-muted mb-4">
                Comments {comments.length > 0 && `· ${comments.length}`}
            </p>
            {userData && (
                <div className="flex flex-col gap-2 mb-5">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-md px-3 py-1.5 text-xs text-blue-500 font-medium">
                            <span>Replying to @{replyingTo.author?.username}</span>
                            <button
                                type="button"
                                className="text-gray-500 hover:text-red-500 cursor-pointer font-semibold"
                                onClick={() => {
                                    setReplyingTo(null);
                                    if (text.startsWith(`@${replyingTo.author?.username}`)) {
                                        setText("");
                                    }
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    <div className="relative flex gap-2">
                        <textarea
                            value={text}
                            onChange={async (e) => {
                            const value = e.target.value;
                            setText(value);

                            const match = value.match(/@([a-zA-Z0-9_]*)$/);

                            if (!match) {
                                setShowSuggestions(false);
                                setSuggestions([]);
                                return;
                            }
                            const query = match[1];
                            if (!query) {
                                setShowSuggestions(false);
                                setSuggestions([]);
                                return;
                            }
                            setMentionQuery(query);
                            try {
                                const response = await axios.get(
                                `${BACKEND_URL}/api/users/search`,
                                {
                                    params: { query },
                                    withCredentials: true,
                                }
                                );
                                setSuggestions(response.data.users || []);
                                setShowSuggestions(true);
                            } catch (error) {
                                console.error(error);
                                setSuggestions([]);
                                setShowSuggestions(false);
                            }
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={replyingTo ? `Reply to @${replyingTo.author?.username}...` : "Write a comment.."}
                            className="form-textarea mt-0 flex-1"
                            rows={2}
                        />

                        {/* suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                        <div
                            className="
                            absolute z-50 mt-1 w-full
                            bg-background border border-border
                            rounded-lg shadow-lg max-h-60 overflow-y-auto
                            "
                        >
                            {suggestions.map((user) => (
                            <button
                                key={user._id}
                                type="button"
                                onClick={() => {
                                const updatedText = text.replace(
                                    /@([a-zA-Z0-9_]*)$/,
                                    `@${user.username} `
                                );

                                setText(updatedText);
                                setMentionQuery("");
                                setSuggestions([]);
                                setShowSuggestions(false);
                                }}
                                className="
                                w-full flex items-center gap-3
                                px-4 py-3 text-left
                                hover:bg-muted transition-colors
                                "
                            >
                                <Image
                                src={user.avatar || "/default-avatar.png"}
                                alt={user.username}
                                width={32}
                                height={32}
                                className="rounded-full"
                                />

                                <span>@{user.username}</span>
                            </button>
                            ))}
                        </div>
                        )}
                        
                       <button
                            disabled={!text.trim() || buttonLoading}
                            onClick={handlePost}
                            className="w-20 md:w-25 h-9 md:h-10 cursor-pointer bg-blue-500 text-white text-sm font-medium rounded-md disabled:opacity-50 self-end"
                        >
                            Post
                        </button>
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-2">
                {comments.length === 0 && (
                    <p className="surface-text-muted py-3 text-center text-[0.9rem]">
                        No comments yet!
                    </p>
                )}

                {comments.map((c) => (
                    <div key={c._id} className="border-b border-border/50 last:border-b-0 pb-2">
                        {renderCommentCard(c)}
                        {c.replies && c.replies.length > 0 && (
                            <div className="ml-10 pl-4 border-l border-border/50 flex flex-col gap-1 mt-1">
                                {c.replies.map((reply) => (
                                    <div key={reply._id}>
                                        {renderCommentCard(reply, c)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {hasMore && (
                    <div className="mt-3 text-center">
                        {loadMoreLoading ? (
                            <InlineLoader text="Loading more comments..." />
                        ) : loadMoreError ? (
                            <div className="flex flex-col items-center gap-1.5 py-2">
                                <p className="text-sm text-red-500 font-medium">Failed to load more comments.</p>
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
