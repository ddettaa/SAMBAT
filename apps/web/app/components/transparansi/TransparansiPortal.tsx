"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarRange, MapPinCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Report } from "@/lib/types";
import KpiCards from "./KpiCards";
import SmartExplainer from "./SmartExplainer";
import CategoryChart from "./CategoryChart";
import DinasLeaderboard from "./DinasLeaderboard";

const MapComponent = dynamic(() => import("../MapComponent"), { ssr: false });

// ─── Filter waktu ───
type TimeFilter = "7d" | "30d" | "90d" | "year" | "all";

const FILTERS: { id: TimeFilter; label: string }[] = [
  { id: "7d", label: "7 Hari" },
  { id: "30d", label: "30 Hari" },
  { id: "90d", label: "3 Bulan" },
  { id: "year", label: "Tahun Ini" },
  { id: "all", label: "Semua" },
];

function filterReports(reports: Report[], filter: TimeFilter): Report[] {
  if (filter === "all") return reports;
  const now = Date.now();
  const limits: Record<TimeFilter, number> = {
    "7d": 7 * 86400_000,
    "30d": 30 * 86400_000,
    "90d": 90 * 86400_000,
    year: 365 * 86400_000,
    all: Infinity,
  };
  const cutoff = now - limits[filter];
  return reports.filter((r) => new Date(r.created_at).getTime() >= cutoff);
}

interface TransparansiPortalProps {
  reports: Report[];
}

// TAB: Transparansi Publik — taste-skill editorial dashboard
// Design read: public data transparency, trust-first, VARIANCE 4 / MOTION 2 / DENSITY 5
export default function TransparansiPortal({ reports }: TransparansiPortalProps) {
  const [filter, setFilter] = useState<TimeFilter>("all");

  const filtered = useMemo(() => filterReports(reports, filter), [reports, filter]);
  const repairedCount = filtered.filter((r) => r.repair_lat && r.repair_lng).length;

  return (
    <div className="bg-white">
      {/* ─── Hero: judul + filter ─── */}
      <section className="border-b border-slate-200">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pt-12 pb-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">
            Transparansi Publik — Kota Banjarmasin
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-2xl text-3xl font-extrabold tracking-tighter leading-[1.05] text-slate-900 sm:text-4xl">
              Semua laporan, terbuka untuk semua.
            </h1>
            {/* Filter waktu — pill buttons */}
            <div className="flex items-center gap-2">
              <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
              <div className="flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
                      filter === f.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-[65ch] text-sm leading-relaxed text-slate-500">
            Data real-time dari pipeline SAMBAT — diklasifikasi AI, diprioritaskan
            SMART, ditindaklanjuti dinas, dikonfirmasi foto perbaikan.
            {repairedCount > 0 && (
              <span className="ml-1 font-semibold text-emerald-700">
                {repairedCount} titik perbaikan telah ditandai di peta.
              </span>
            )}
          </p>
        </div>
      </section>

      {/* ─── KPI ─── */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 py-8">
        <KpiCards reports={filtered} />
      </section>

      {/* ─── Peta + Explainer ─── */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pb-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                Peta Sebaran &amp; Titik Perbaikan
              </h2>
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <MapPinCheck className="h-3.5 w-3.5 text-emerald-600" />
                {repairedCount} perbaikan
              </span>
            </div>
            <div className="h-[480px] overflow-hidden rounded-xl border border-slate-200 lg:h-[520px]">
              <MapComponent reports={filtered} />
            </div>
          </div>
          <SmartExplainer />
        </div>
      </section>

      {/* ─── Statistik + Leaderboard ─── */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pb-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <CategoryChart reports={filtered} />
          <DinasLeaderboard reports={filtered} />
        </div>
      </section>
    </div>
  );
}
