"use client";

import { AlertTriangle, Check, Info, Search } from "lucide-react";
import { getPriorityColor, getStatusBadgeClass } from "@/lib/utils";
import type { ReportDetail, TimelineEvent } from "@/lib/types";

interface TicketTrackerProps {
  trackId: string;
  onTrackIdChange: (value: string) => void;
  trackedReport: ReportDetail | null;
  trackedTimeline: TimelineEvent[];
  trackingError: string;
  confirmToken: string;
  onConfirmTokenChange: (value: string) => void;
  onTrack: () => void;
  onConfirmCompletion: () => void;
}

// Panel "Lacak Status & Transparansi Tiket" untuk warga
export default function TicketTracker({
  trackId,
  onTrackIdChange,
  trackedReport,
  trackedTimeline,
  trackingError,
  confirmToken,
  onConfirmTokenChange,
  onTrack,
  onConfirmCompletion,
}: TicketTrackerProps) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-teal-700" />
          Lacak Status & Transparansi Tiket
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Masukkan ID Tiket Anda untuk melihat tahapan pengerjaan dinas secara
          terbuka.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onTrack();
          }}
          className="flex gap-2 mb-6"
        >
          <input
            type="text"
            value={trackId}
            onChange={(e) => onTrackIdChange(e.target.value)}
            placeholder="Masukkan ID Tiket (rpt_...)"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono focus:bg-white transition-all"
            required
          />
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            Lacak
          </button>
        </form>

        {trackingError && (
          <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
            {trackingError}
          </p>
        )}

        {trackedReport && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Tiket ID:{" "}
                  <span className="font-mono text-slate-800">
                    {trackedReport.id}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1 capitalize flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      trackedReport.category === "sampah"
                        ? "bg-purple-400"
                        : trackedReport.category === "drainase"
                          ? "bg-blue-400"
                          : trackedReport.category === "jalan"
                            ? "bg-pink-400"
                            : "bg-amber-400"
                    }`}
                  ></span>
                  {trackedReport.category}
                </h3>
              </div>
              <span
                className={`px-3 py-1 text-[10px] font-bold tracking-wide uppercase border rounded-full ${getStatusBadgeClass(trackedReport.status)}`}
              >
                {trackedReport.status.replace("_", " ")}
              </span>
            </div>

            {/* Before / After Images */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Foto Kejadian (Warga)
                </span>
                {trackedReport.image_before ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={trackedReport.image_before}
                    className="w-full h-24 object-cover rounded-xl border border-slate-200 shadow-sm"
                    alt="Foto Sebelum"
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-400">
                    Tidak ada foto
                  </div>
                )}
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Foto Perbaikan (Dinas)
                </span>
                {trackedReport.image_after ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={trackedReport.image_after}
                    className="w-full h-24 object-cover rounded-xl border border-slate-200 shadow-sm"
                    alt="Foto Perbaikan"
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-400">
                    Menunggu pengerjaan
                  </div>
                )}
              </div>
            </div>

            {/* Transparan SMART & Normalization */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 relative group">
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Laporan Asli (Bahasa Banjar)
                </span>
                <p className="text-xs text-slate-600 italic mt-0.5">
                  &quot;{trackedReport.text_original}&quot;
                </p>
              </div>
              {trackedReport.text_normalized &&
                trackedReport.text_normalized !== trackedReport.text_original && (
                  <div>
                    <span className="block text-[9px] font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1">
                      <Check className="h-3 w-3" /> Hasil Terjemahan Otomatis
                      (AI)
                    </span>
                    <p className="text-xs text-slate-800 mt-0.5 font-medium">
                      &quot;{trackedReport.text_normalized}&quot;
                    </p>
                  </div>
                )}

              <div className="border-t border-slate-200 pt-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">
                    Skor Prioritas SMART:
                  </span>
                  <span
                    className="font-extrabold text-slate-800"
                    style={{
                      color: getPriorityColor(trackedReport.priority),
                    }}
                  >
                    {trackedReport.priority} / 100
                  </span>
                </div>

                {/* SMART Progress Bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${trackedReport.priority}%`,
                      backgroundColor: getPriorityColor(trackedReport.priority),
                    }}
                  />
                </div>
                <div className="text-[9px] text-slate-400 italic mt-0.5">
                  *Arahkan kursor ke sini untuk melihat pembobotan SMART.
                </div>
              </div>

              {/* Interactive Tooltip Formula */}
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-3 rounded-xl border border-slate-800 shadow-xl z-50 w-72 leading-relaxed">
                <div className="font-bold border-b border-slate-700 pb-1 mb-1.5 text-amber-400 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Rumus SMART Prioritas:
                </div>
                <div className="font-mono mb-2">P = 30U + 25D + 20V + 15T + 10R</div>
                <div className="space-y-1 text-slate-300 font-mono text-[9px]">
                  <div>
                    • U (Bahaya Keamanan) ={" "}
                    {trackedReport.priority_detail?.U || 25} (Bobot 30%)
                  </div>
                  <div>
                    • D (Laporan Serupa) ={" "}
                    {trackedReport.priority_detail?.D || 25} (Bobot 25%)
                  </div>
                  <div>
                    • V (Kekuatan Bukti) ={" "}
                    {trackedReport.priority_detail?.V || 0} (Bobot 20%)
                  </div>
                  <div>
                    • T (Waktu Tunggu) ={" "}
                    {trackedReport.priority_detail?.T || 0} (Bobot 15%)
                  </div>
                  <div>
                    • R (Kerawanan Daerah) ={" "}
                    {trackedReport.priority_detail?.R || 25} (Bobot 10%)
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Perjalanan Pengaduan
              </span>
              <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                {trackedTimeline.map((evt, idx) => (
                  <div key={idx} className="relative pl-4 text-xs">
                    <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 border-2 border-white"></span>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 capitalize">
                        {evt.status.replace("_", " ")}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.created_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {evt.note && (
                      <div className="text-slate-500 font-medium text-[10px] mt-0.5">
                        {evt.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Citizen confirmation box */}
      {trackedReport && trackedReport.status === "menunggu_konfirmasi" && (
        <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-4 mt-6">
          <h4 className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Konfirmasi Hasil Perbaikan
          </h4>
          <p className="text-[11px] text-slate-600 mb-3">
            Dinas menyatakan keluhan telah selesai dikerjakan. Masukkan token
            konfirmasi Anda untuk menutup kasus:
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={confirmToken}
              onChange={(e) => onConfirmTokenChange(e.target.value)}
              placeholder="Token Konfirmasi"
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none flex-1 font-mono focus:border-amber-500"
            />
            <button
              onClick={onConfirmCompletion}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Konfirmasi Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
