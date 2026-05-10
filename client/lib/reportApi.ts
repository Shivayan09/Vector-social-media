import axios from "axios";
import type { ReportReason } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const reportPost = async (postId: string, reason: ReportReason, details?: string) => {
  return axios.post(
    `${BACKEND_URL}/api/reports/posts`,
    { postId, reason, details },
    { withCredentials: true }
  );
};

export const reportComment = async (commentId: string, reason: ReportReason, details?: string) => {
  return axios.post(
    `${BACKEND_URL}/api/reports/comments`,
    { commentId, reason, details },
    { withCredentials: true }
  );
};
