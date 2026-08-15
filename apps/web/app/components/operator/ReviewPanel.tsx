"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { DINAS_BY_CATEGORY, DEFAULT_DINAS_ID } from "@/lib/constants";
import type { Dinas, Report } from "@/lib/types";

const CATEGORIES = ["sampah", "drainase", "jalan", "lampu", "lainnya"];

interface ReviewPanelProps {
  report: Report | null;
  dinasList: Dinas[];
  loading: boolean;
  message: string;
  onSubmit: (dinasId: string) => void;
}

// Panel verifikasi manual — koreksi kategori & pilih dinas penerima.
// Catatan: beri prop `key={report.id}` dari parent agar form ter-reset
// dengan nilai default laporan yang baru dipilih.
export default function ReviewPanel({
  report,
  dinasList,
  loading,
  message,
  onSubmit,
}: ReviewPanelProps) {
  const [editCategory, setEditCategory] = useState(
    report?.category ?? "lainnya"
  );
  const [editDinas, setEditDinas] = useState(
    (report && DINAS_BY_CATEGORY[report.category]) || DEFAULT_DINAS_ID
  );

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
      <h3 className="text-sm font-extrabold text-slate-900 mb-4">
        Panel Verifikasi Manual
      </h3>

      {report ? (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Isi Aduan
            </span>
            <p className="text-xs text-slate-700 italic">
              &quot;{report.text_original}&quot;
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              Koreksi Kategori
            </label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              Dinas Penerima
            </label>
            <select
              value={editDinas}
              onChange={(e) => setEditDinas(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white"
            >
              {dinasList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.short} — {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onSubmit(editDinas)}
            disabled={loading}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-4 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Tembuskan ke Dinas
          </button>

          {message && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">
              {message}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-24 text-xs text-slate-400 font-medium">
          Pilih salah satu laporan di antrean sebelah kiri untuk melakukan
          review visual manual.
        </div>
      )}
    </div>
  );
}
