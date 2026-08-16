"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { routeReport } from "@/lib/api";
import type { Case, Dinas, Report } from "@/lib/types";
import StatsCards from "./StatsCards";
import TriageQueue from "./TriageQueue";
import ReviewPanel from "./ReviewPanel";
import CasesTable from "./CasesTable";

interface OperatorDashboardProps {
  reports: Report[];
  cases: Case[];
  dinasList: Dinas[];
  onDataChanged: () => void;
}

// Dasbor Operator — verifikasi & triage aduan ambigu.
// Otentikasi ditangani terpusat oleh halaman /login + guard di /operator.
export default function OperatorDashboard({
  reports,
  cases,
  dinasList,
  onDataChanged,
}: OperatorDashboardProps) {
  const [reviewReport, setReviewReport] = useState<Report | null>(null);
  const [operatorMsg, setOperatorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTriage = async (dinasId: string) => {
    if (!reviewReport) return;
    setLoading(true);
    setOperatorMsg("");

    const result = await routeReport(reviewReport.id, dinasId);
    if (result.ok) {
      setOperatorMsg(
        "Laporan berhasil diverifikasi dan diteruskan ke " +
          dinasId.toUpperCase()
      );
      setReviewReport(null);
      onDataChanged();
    } else {
      setOperatorMsg("Gagal melakukan routing: " + result.error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Section header */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <User className="h-4.5 w-4.5 text-teal-700" />
          Verifikasi & Penyaringan Laporan (Operator)
        </h2>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Aduan dengan confidence AI tinggi sudah otomatis diteruskan ke dinas
          — antrean ini hanya berisi aduan ambigu.
        </p>
      </div>

      <StatsCards reports={reports} cases={cases} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <TriageQueue
          reports={reports}
          selectedReportId={reviewReport?.id}
          onSelectReport={(report) => {
            setReviewReport(report);
            setOperatorMsg("");
          }}
        />
        {/* key={id} memastikan form ter-reset ke default laporan terpilih */}
        <ReviewPanel
          key={reviewReport?.id ?? "empty"}
          report={reviewReport}
          dinasList={dinasList}
          loading={loading}
          message={operatorMsg}
          onSubmit={handleTriage}
        />
      </div>

      <CasesTable cases={cases} />
    </div>
  );
}
