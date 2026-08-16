"use client";

import { useState } from "react";
import { Building, CheckCircle } from "lucide-react";
import { updateReportStatus } from "@/lib/api";
import { DEFAULT_DINAS_ID } from "@/lib/constants";
import { getStatusBadgeClass } from "@/lib/utils";
import type { Dinas, Report } from "@/lib/types";
import SlaCountdown from "../SlaCountdown";

interface DinasPortalProps {
  reports: Report[];
  dinasList: Dinas[];
  onDataChanged: () => void;
}

// Mock foto bukti perbaikan berdasarkan kategori (untuk demo)
function getProofImage(category?: string): string {
  switch (category) {
    case "sampah":
      return "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=400";
    case "jalan":
      return "https://images.unsplash.com/photo-1533563906091-fdfdffc3e3c4?q=80&w=400";
    case "lampu":
      return "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=400";
    default:
      return "https://images.unsplash.com/photo-1595841696660-1d965503a552?q=80&w=400";
  }
}

// TAB: Portal Dinas — antrean tugas operasional OPD
export default function DinasPortal({
  reports,
  dinasList,
  onDataChanged,
}: DinasPortalProps) {
  const [selectedDinas, setSelectedDinas] = useState(DEFAULT_DINAS_ID);
  const [loading, setLoading] = useState(false);

  const handleDinasAction = async (
    reportId: string,
    action: "dikerjakan" | "selesai"
  ) => {
    setLoading(true);

    const nextStatus =
      action === "dikerjakan" ? "dikerjakan" : "menunggu_konfirmasi";
    const report = reports.find((r) => r.id === reportId);
    const imageAfter =
      action === "selesai" ? getProofImage(report?.category) : undefined;

    const result = await updateReportStatus(
      reportId,
      nextStatus,
      `Dikerjakan oleh dinas ${selectedDinas.toUpperCase()}`,
      imageAfter
    );
    if (result.ok) {
      onDataChanged();
    } else {
      alert("Gagal memperbarui status: " + result.error);
    }
    setLoading(false);
  };

  const tasks = reports.filter(
    (r) =>
      r.dinas_id === selectedDinas &&
      ["diteruskan", "dikerjakan"].includes(r.status)
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Dinas Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Pilih Dinas Eksekutor
          </h3>
          <p className="text-xs text-slate-500">
            Tampilkan laporan yang didelegasikan sesuai penanggung jawab OPD
            terkait.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {dinasList.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDinas(d.id)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedDinas === d.id
                  ? "bg-teal-700 text-white font-bold shadow-sm"
                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800"
              }`}
            >
              {d.short}
            </button>
          ))}
        </div>
      </div>

      {/* Task list for Dinas */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h3 className="text-sm font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <Building className="h-4 w-4 text-teal-700" />
          Antrean Tugas Operasional — {selectedDinas.toUpperCase()}
        </h3>

        <div className="space-y-4">
          {tasks.map((report) => (
            <div
              key={report.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-6 hover:shadow-md transition-all"
            >
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-slate-500 font-bold text-xs">
                    {report.id}
                  </span>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold border rounded-full ${getStatusBadgeClass(report.status)}`}
                  >
                    {report.status}
                  </span>

                  {/* SLA Countdown Timer */}
                  <SlaCountdown slaDue={report.sla_due} />
                </div>

                <div className="space-y-1">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Aduan Warga (Normalized)
                  </span>
                  <p className="text-xs text-slate-800 font-bold">
                    &quot;{report.text_normalized || report.text_original}&quot;
                  </p>
                </div>

                <div className="text-[10px] text-slate-500 font-medium">
                  Lokasi:{" "}
                  <span className="text-slate-800 font-semibold">
                    {report.location_text || "Banjarmasin"}
                  </span>
                </div>

                {/* Photo Before */}
                {report.image_before && (
                  <div className="mt-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Bukti Awal
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.image_before}
                      className="w-32 h-20 object-cover rounded-xl border border-slate-200 shadow-sm"
                      alt="Sebelum"
                    />
                  </div>
                )}
              </div>

              {/* Dinas Actions */}
              <div className="flex md:flex-col gap-2 min-w-[150px]">
                {report.status === "diteruskan" && (
                  <button
                    onClick={() => handleDinasAction(report.id, "dikerjakan")}
                    disabled={loading}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    Ambil Tugas
                  </button>
                )}
                {report.status === "dikerjakan" && (
                  <button
                    onClick={() => handleDinasAction(report.id, "selesai")}
                    disabled={loading}
                    className="flex-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm shadow-teal-700/10 disabled:opacity-50"
                  >
                    Selesaikan & Unggah Bukti
                  </button>
                )}
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
              <CheckCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">
                Tidak ada laporan aktif yang perlu ditindaklanjuti.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
