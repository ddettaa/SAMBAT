"use client";

import { Building } from "lucide-react";
import type { Report } from "@/lib/types";

interface DinasLeaderboardProps {
  reports: Report[];
}

// Kinerja nyata dinas dari data laporan aktual (bukan mock).
// Skor dihitung dari: % selesai, rata-rata waktu respons, dan beban tugas.
export default function DinasLeaderboard({ reports }: DinasLeaderboardProps) {
  const dinasStats = new Map<
    string,
    { total: number; selesai: number; onTime: number; aktif: number }
  >();

  for (const r of reports) {
    if (!r.dinas_id) continue;
    const stat = dinasStats.get(r.dinas_id) || { total: 0, selesai: 0, onTime: 0, aktif: 0 };
    stat.total++;
    if (r.status === "selesai") {
      stat.selesai++;
      if (r.sla_due && new Date(r.sla_due) > new Date(r.created_at)) stat.onTime++;
    } else if (["diteruskan", "dikerjakan"].includes(r.status)) {
      stat.aktif++;
    }
    dinasStats.set(r.dinas_id, stat);
  }

  const DINAS_NAMES: Record<string, { short: string; name: string }> = {
    "d-pupr": { short: "PUPR", name: "Dinas Pekerjaan Umum & Penataan Ruang" },
    "d-dlh": { short: "DLH", name: "Dinas Lingkungan Hidup" },
    "d-dishub": { short: "DISHUB", name: "Dinas Perhubungan" },
    "d-bpbd": { short: "BPBD", name: "Badan Penanggulangan Bencana Daerah" },
  };

  const leaderboard = Array.from(dinasStats.entries())
    .map(([dinasId, stat]) => {
      const info = DINAS_NAMES[dinasId];
      const completionRate = stat.total > 0 ? Math.round((stat.selesai / stat.total) * 100) : 0;
      const onTimeRate = stat.selesai > 0 ? Math.round((stat.onTime / stat.selesai) * 100) : 100;
      const score = Math.round((completionRate * 0.6 + onTimeRate * 0.4));
      return {
        dinasId,
        short: info?.short ?? dinasId.toUpperCase(),
        name: info?.name ?? dinasId,
        total: stat.total,
        selesai: stat.selesai,
        aktif: stat.aktif,
        completionRate,
        onTimeRate,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const rankColors = [
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-slate-200 text-slate-700 border-slate-300",
    "bg-slate-100 text-slate-500 border-slate-200",
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <Building className="h-4 w-4 text-teal-700" />
        Kinerja Tanggap Dinas
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Peringkat akuntabilitas berdasarkan data laporan aktual.
      </p>

      <div className="mt-6 space-y-3">
        {leaderboard.length > 0 ? (
          leaderboard.map((dinas, idx) => (
            <div
              key={dinas.dinasId}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-slate-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${rankColors[idx] ?? rankColors[2]}`}
                >
                  #{idx + 1}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-extrabold text-slate-900">
                    {dinas.short}
                  </span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {dinas.name}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4 sm:gap-6">
                <div className="text-right">
                  <span className="block text-xs font-extrabold text-teal-700">
                    {dinas.completionRate}%
                  </span>
                  <span className="block text-[9px] font-bold text-slate-400">
                    Selesai
                  </span>
                </div>
                <div className="hidden text-right sm:block">
                  <span className="block text-xs font-bold text-slate-700">
                    {dinas.total}
                  </span>
                  <span className="block text-[9px] text-slate-400">
                    Total Tiket
                  </span>
                </div>
                <div className="min-w-[45px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-center">
                  <span className="block text-xs font-extrabold text-slate-800">
                    {dinas.score}
                  </span>
                  <span className="block font-mono text-[8px] text-slate-400">
                    Index
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center">
            <p className="text-xs font-bold text-slate-400">
              Belum ada data kinerja dinas.
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Kinerja akan muncul setelah ada laporan yang diteruskan ke dinas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
