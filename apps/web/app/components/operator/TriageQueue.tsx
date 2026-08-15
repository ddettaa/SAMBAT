"use client";

import { CheckCircle, ShieldAlert } from "lucide-react";
import type { Report } from "@/lib/types";

interface TriageQueueProps {
  reports: Report[];
  selectedReportId?: string;
  onSelectReport: (report: Report) => void;
}

// Antrean penyaringan & verifikasi AI (aduan ambigu berstatus "terdeteksi")
export default function TriageQueue({
  reports,
  selectedReportId,
  onSelectReport,
}: TriageQueueProps) {
  const pendingReports = reports.filter((r) => r.status === "terdeteksi");

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 lg:col-span-2">
      <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        Penyaringan & Verifikasi AI (Aduan Ambigu)
      </h3>

      <div className="space-y-3 overflow-y-auto max-h-[450px] pr-2">
        {pendingReports.map((report) => (
          <div
            key={report.id}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:bg-slate-50/80 ${
              selectedReportId === report.id
                ? "bg-teal-50/50 border-teal-500/30"
                : "bg-white border-slate-200"
            }`}
            onClick={() => onSelectReport(report)}
          >
            <div className="flex items-center justify-between text-[10px] mb-2">
              <span className="font-mono text-slate-500 font-bold">
                {report.id}
              </span>
              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                Tingkat Akurasi AI:{" "}
                {typeof report.confidence === "number"
                  ? Math.round(report.confidence * 100)
                  : 0}
                %
              </span>
            </div>

            {/* Banjar original text & Normalized text display */}
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-slate-500 italic">
                Banjar: &quot;{report.text_original}&quot;
              </p>
              {report.text_normalized &&
                report.text_normalized !== report.text_original && (
                  <p className="text-xs text-slate-800 font-bold">
                    Terjemahan: &quot;{report.text_normalized}&quot;
                  </p>
                )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-2">
              <span>
                Kategori:{" "}
                <strong className="text-slate-800 capitalize">
                  {report.category}
                </strong>
              </span>
              <span>
                Prioritas:{" "}
                <strong className="text-red-600">{report.priority}</strong>
              </span>
            </div>
          </div>
        ))}

        {pendingReports.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            <CheckCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">
              Semua laporan terverifikasi secara otomatis oleh AI!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
