"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AuthGuard from "@/components/AuthGuard";
import { useAppContext } from "@/context/AppContext";
import { getModeratorReportById } from "@/lib/reportApi";
import type { Report } from "@/lib/types";

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const { userData } = useAppContext();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const isModerator = useMemo(
    () => userData?.role === "admin" || userData?.role === "moderator",
    [userData?.role]
  );

  const targetPost = useMemo(() => {
    if (!report || typeof report.targetId === "string") {
      return null;
    }
    return report.targetId;
  }, [report]);

  useEffect(() => {
    const loadReport = async () => {
      if (!params?.id || !isModerator) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getModeratorReportById(params.id);
        setReport(data.report);
      } catch {
        toast.error("Failed to load report details");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [isModerator, params?.id]);

  return (
    <AuthGuard>
      <div className="min-h-screen p-6 md:p-10 bg-[url('/vector-home-bg-light.png')] bg-cover bg-center">
        <div className="max-w-4xl mx-auto rounded-2xl bg-white/85 backdrop-blur border border-black/10 p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h1 className="text-2xl font-semibold text-slate-900">Report details</h1>
            <Link href="/admin/reports" className="px-4 py-2 rounded-md border text-sm hover:bg-black/5">
              Back to reports
            </Link>
          </div>

          {!isModerator && <p className="text-red-600 font-medium">You do not have moderator access.</p>}
          {isModerator && loading && <p className="text-slate-700">Loading report...</p>}
          {isModerator && !loading && !report && <p className="text-slate-700">Report not found.</p>}

          {isModerator && !loading && report && (
            <div className="grid gap-4 text-sm text-slate-800">
              <section className="rounded-xl border border-black/10 p-4 bg-white/70">
                <h2 className="font-semibold text-base mb-2">Post content</h2>
                <p className="whitespace-pre-wrap">{targetPost?.content || "No text content"}</p>
                {targetPost?.image && (
                  <img
                    src={targetPost.image}
                    alt="Reported post"
                    className="mt-3 max-h-96 rounded-lg border border-black/10"
                  />
                )}
              </section>

              <section className="rounded-xl border border-black/10 p-4 bg-white/70 grid md:grid-cols-2 gap-3">
                <div>
                  <p className="font-medium">Reported reason</p>
                  <p className="capitalize">{report.reason.replaceAll("_", " ")}</p>
                </div>
                <div>
                  <p className="font-medium">Current status</p>
                  <p className="capitalize">{report.status.replaceAll("_", " ")}</p>
                </div>
                <div>
                  <p className="font-medium">Reported by</p>
                  <p>{report.reportedBy?.username || report.reportedBy?.name || "Unknown"}</p>
                </div>
                <div>
                  <p className="font-medium">Reported at</p>
                  <p>{new Date(report.createdAt).toLocaleString()}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="font-medium">Report description</p>
                  <p>{report.details || "No additional details"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="font-medium">Moderator notes</p>
                  <p>{report.moderatorNotes || "No moderator notes"}</p>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
