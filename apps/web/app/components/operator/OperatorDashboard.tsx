"use client";

import { useState } from "react";
import { Lock, User } from "lucide-react";
import { routeReport } from "@/lib/api";
import type { Case, Dinas, Report } from "@/lib/types";
import OperatorLogin from "./OperatorLogin";
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

// TAB: Dasbor Operator — verifikasi, triage, dan disposisi laporan
export default function OperatorDashboard({
  reports,
  cases,
  dinasList,
  onDataChanged,
}: OperatorDashboardProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  if (!isLoggedIn) {
    return <OperatorLogin onSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Dashboard Header with Logout */}
      <div className="flex items-center justify-between bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-teal-700" />
            Verifikasi & Penyaringan Laporan (Operator)
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Sesi aktif terverifikasi menggunakan operator_key
          </p>
        </div>
        <button
          onClick={() => setIsLoggedIn(false)}
          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" /> Kunci Kembali
        </button>
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
