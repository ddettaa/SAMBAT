import { Building } from "lucide-react";

const LEADERBOARD = [
  { rank: 1, name: "Dinas Lingkungan Hidup", short: "DLH", sla: 94, time: "14 Jam", score: 96 },
  { rank: 2, name: "Dinas Pekerjaan Umum & Penataan Ruang", short: "PUPR", sla: 88, time: "22 Jam", score: 89 },
  { rank: 3, name: "Dinas Perhubungan", short: "DISHUB", sla: 85, time: "28 Jam", score: 84 },
  { rank: 4, name: "Badan Penanggulangan Bencana Daerah", short: "BPBD", sla: 82, time: "31 Jam", score: 80 },
];

// Peringkat kinerja tanggap dinas (OPD Leaderboard)
export default function DinasLeaderboard() {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
      <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
        <Building className="h-4.5 w-4.5 text-teal-700" />
        Kinerja Tanggap Dinas (OPD Leaderboard)
      </h3>
      <p className="text-xs text-slate-500 mb-6">
        Peringkat akuntabilitas respons dinas pemegang anggaran daerah
        Banjarmasin dalam menyelesaikan keluhan warga.
      </p>

      <div className="space-y-4">
        {LEADERBOARD.map((dinas) => (
          <div
            key={dinas.rank}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                  dinas.rank === 1
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : dinas.rank === 2
                      ? "bg-slate-200 text-slate-700 border border-slate-300"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                #{dinas.rank}
              </div>
              <div>
                <span className="font-extrabold text-xs text-slate-900">
                  {dinas.short}
                </span>
                <span className="text-[10px] text-slate-500 block truncate max-w-[200px] sm:max-w-xs">
                  {dinas.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-xs font-extrabold text-teal-700 block">
                  {dinas.sla}%
                </span>
                <span className="text-[9px] text-slate-400 block font-bold">
                  Ketepatan Waktu
                </span>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-700 block">
                  {dinas.time}
                </span>
                <span className="text-[9px] text-slate-400 block">
                  Rata-rata Respons
                </span>
              </div>
              <div className="bg-white px-2 py-1 border border-slate-200 rounded-lg text-center min-w-[45px]">
                <span className="text-xs font-extrabold text-slate-800">
                  {dinas.score}
                </span>
                <span className="text-[8px] text-slate-400 block font-mono">
                  Index
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
