"use client";

import { useState } from "react";
import { confirmReport, fetchReportDetail } from "@/lib/api";
import type { ReportDetail, TimelineEvent } from "@/lib/types";

// State & aksi untuk fitur "Lacak Tiket" di Portal Warga
export function useTicketTracking(onDataChanged: () => void) {
  const [trackId, setTrackId] = useState("");
  const [trackedReport, setTrackedReport] = useState<ReportDetail | null>(null);
  const [trackedTimeline, setTrackedTimeline] = useState<TimelineEvent[]>([]);
  const [trackingError, setTrackingError] = useState("");
  const [confirmToken, setConfirmToken] = useState("");
  const [confirmSuccess, setConfirmSuccess] = useState(false);
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
    setConfirmSuccess(false);

    const data = await fetchReportDetail(id);
    if (data) {
      applyDetail(data);
    } else {
      setTrackingError("Laporan tidak ditemukan. Pastikan ID Tiket Anda benar.");
    }
    setLoading(false);
  };

  // Klik kartu aduan di social feed -> langsung tampil di panel lacak
  const selectFromFeed = async (reportId: string) => {
    setTrackId(reportId);
    setTrackingError("");
    setConfirmSuccess(false);
    const data = await fetchReportDetail(reportId);
    if (data) applyDetail(data);
  };

  // Konfirmasi warga bahwa perbaikan dinas sudah selesai
  const confirmCompletion = async () => {
    if (!trackedReport) return;
    setLoading(true);

    const result = await confirmReport(trackedReport.id, confirmToken);
    if (result.ok) {
      setConfirmSuccess(true);
      const updated = await fetchReportDetail(trackedReport.id);
      if (updated) applyDetail(updated);
      onDataChanged();
    } else {
      alert("Konfirmasi gagal: " + result.error);
    }
    setLoading(false);
  };

  return {
    trackId,
    setTrackId,
    trackedReport,
    trackedTimeline,
    trackingError,
    confirmToken,
    setConfirmToken,
    confirmSuccess,
    loading,
    track,
    selectFromFeed,
    confirmCompletion,
  };
}
