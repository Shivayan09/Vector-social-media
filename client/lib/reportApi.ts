import axios from "axios";
import type { Report, ReportReason, ReportStatus } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type ReportListResponse = {
  success: boolean;
  reports: Report[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
};

export const reportPost = async (postId: string, reason: ReportReason, details?: string) => {
  return axios.post(
    `${BACKEND_URL}/api/reports/posts`,
    { postId, reason, details },
    { withCredentials: true }
  );
};

export const getModeratorReports = async (status?: ReportStatus) => {
  const { data } = await axios.get<ReportListResponse>(`${BACKEND_URL}/api/reports`, {
    withCredentials: true,
    params: status ? { status } : undefined,
  });
  return data;
};

export const getModeratorReportById = async (reportId: string) => {
  const { data } = await axios.get<{ success: boolean; report: Report }>(
    `${BACKEND_URL}/api/reports/${reportId}`,
    { withCredentials: true }
  );
  return data;
};

export const updateModeratorReportStatus = async (
  reportId: string,
  status: ReportStatus,
  moderatorNotes?: string
) => {
  const { data } = await axios.patch<{ success: boolean; report: Report }>(
    `${BACKEND_URL}/api/reports/${reportId}/status`,
    { status, moderatorNotes },
    { withCredentials: true }
  );
  return data;
};

export const takeModeratorReportAction = async (
  reportId: string,
  action: "post_deleted",
  moderatorNotes?: string
) => {
  const { data } = await axios.patch<{ success: boolean; report: Report }>(
    `${BACKEND_URL}/api/reports/${reportId}/action`,
    { action, moderatorNotes },
    { withCredentials: true }
  );
  return data;
};
