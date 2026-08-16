"use client";

import { useState } from "react";
import { fetchReportDetail } from "@/lib/api";
import type { ReportDetail, TimelineEvent } from "@/lib/types";

// State & aksi untuk fitur "Lacak Tiket" di Portal Warga
export function useTicketTracking() {
  const [trackId, setTrackId] = useState("");
  const [trackedReport, setTrackedReport] = useState<ReportDetail | null>(null);
  const [trackedTimeline, setTrackedTimeline] = useState<TimelineEvent[]>([]);
  const [trackingError, setTrackingError] = useState("");
  const [loading, setLoading] = useState(false);

  const applyDetail = (data: ReportDetail) => {
    setTrackedReport(data);
    setTrackedTimeline(data.timeline || []);
  };

  // Lacak tiket berdasarkan ID yang diketik warga
  const track = async () => {
    const id = trackId.trim();
    if (!id) return;
    setLoading(true);
    setTrackingError("");
    setTrackedReport(null);

    const data = await fetchReportDetail(id);
    if (data) {
      applyDetail(data);
    } else {
      setTrackingError("Laporan tidak ditemukan. Pastikan ID Tiket Anda benar.");
    }
    setLoading(false);
  };

  // Klik baris aduan di social feed -> langsung tampil di panel lacak
  const selectFromFeed = async (reportId: string) => {
    setTrackId(reportId);
    setTrackingError("");
    const data = await fetchReportDetail(reportId);
    if (data) applyDetail(data);
  };

  return {
    trackId,
    setTrackId,
    trackedReport,
    trackedTimeline,
    trackingError,
    loading,
    track,
    selectFromFeed,
  };
}
