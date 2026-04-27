"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import AuthGuard from "@/components/AuthGuard";
import { useAppContext } from "@/context/AppContext";
import type { Report, ReportStatus } from "@/lib/types";
import {
  getModeratorReports,
  takeModeratorReportAction,
  updateModeratorReportStatus,
} from "@/lib/reportApi";

const statusLabel: Record<ReportStatus, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  rejected: "Rejected",
  actioned: "Actioned",
};

export default function AdminReportsPage() {
  const { userData } = useAppContext();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isModerator = useMemo(
    () => userData?.role === "admin" || userData?.role === "moderator",
    [userData?.role]
  );

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getModeratorReports("open");
      setReports(data.reports || []);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isModerator) {
      loadReports();
    } else {
      setLoading(false);
    }
  }, [isModerator, loadReports]);

  const updateStatus = async (reportId: string, status: Extract<ReportStatus, "in_review" | "resolved" | "rejected">) => {
    try {
      setActionLoadingId(reportId);
      const data = await updateModeratorReportStatus(reportId, status);
      setReports((prev) => prev.map((report) => (report._id === reportId ? data.report : report)));
      toast.success("Report updated");
    } catch {
      toast.error("Failed to update report");
    } finally {
      setActionLoadingId(null);
    }
  };

  const deletePostAndResolve = async (reportId: string) => {
    try {
      setActionLoadingId(reportId);
      const data = await takeModeratorReportAction(reportId, "post_deleted");
      setReports((prev) => prev.map((report) => (report._id === reportId ? data.report : report)));
      toast.success("Post deleted and report actioned");
    } catch {
      toast.error("Failed to perform moderation action");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen p-6 md:p-10 bg-[url('/vector-home-bg-light.png')] bg-cover bg-center">
        <div className="max-w-7xl mx-auto rounded-2xl bg-white/80 backdrop-blur border border-black/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
            <button
              onClick={loadReports}
              className="px-4 py-2 rounded-md border text-sm hover:bg-black/5"
            >
              Refresh
            </button>
          </div>

          {!isModerator && (
            <p className="text-red-600 font-medium">You do not have moderator access.</p>
          )}

          {isModerator && loading && <p className="text-slate-700">Loading reports...</p>}

          {isModerator && !loading && reports.length === 0 && (
            <p className="text-slate-700">No reports found.</p>
          )}

          {isModerator && !loading && reports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="py-3 pr-3 text-sm font-semibold">Reporter</th>
                    <th className="py-3 pr-3 text-sm font-semibold">Reason</th>
                    <th className="py-3 pr-3 text-sm font-semibold">Post author</th>
                    <th className="py-3 pr-3 text-sm font-semibold">Created</th>
                    <th className="py-3 pr-3 text-sm font-semibold">Status</th>
                    <th className="py-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const isBusy = actionLoadingId === report._id;
                    return (
                      <tr key={report._id} className="border-b border-black/5 align-top">
                        <td className="py-3 pr-3 text-sm text-slate-800">
                          {report.reportedBy?.username || report.reportedBy?.name || "Unknown"}
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-800 capitalize">
                          {report.reason.replaceAll("_", " ")}
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-800">
                          {report.postAuthor?.username || report.postAuthor?.name || "Unknown"}
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-800">
                          {new Date(report.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-800">{statusLabel[report.status]}</td>
                        <td className="py-3 text-sm">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/reports/${report._id}`}
                              className="px-2.5 py-1.5 rounded border hover:bg-black/5"
                            >
                              View
                            </Link>
                            <button
                              disabled={isBusy}
                              onClick={() => updateStatus(report._id, "in_review")}
                              className="px-2.5 py-1.5 rounded border hover:bg-black/5 disabled:opacity-60"
                            >
                              Mark in review
                            </button>
                            <button
                              disabled={isBusy}
                              onClick={() => updateStatus(report._id, "resolved")}
                              className="px-2.5 py-1.5 rounded border hover:bg-black/5 disabled:opacity-60"
                            >
                              Resolve
                            </button>
                            <button
                              disabled={isBusy}
                              onClick={() => updateStatus(report._id, "rejected")}
                              className="px-2.5 py-1.5 rounded border hover:bg-black/5 disabled:opacity-60"
                            >
                              Reject
                            </button>
                            <button
                              disabled={isBusy}
                              onClick={() => deletePostAndResolve(report._id)}
                              className="px-2.5 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              Delete post and resolve
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
