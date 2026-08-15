import { Globe } from "lucide-react";
import type { Report } from "@/lib/types";

interface CategoryChartProps {
  reports: Report[];
}

// Statistik kategori pengaduan + grafik tren SLA (SVG)
export default function CategoryChart({ reports }: CategoryChartProps) {
  const categories = [
    {
      cat: "Drainase / Banjir",
      count: reports.filter((r) => r.category === "drainase").length,
      color: "bg-blue-500",
    },
    {
      cat: "Jalan Rusak",
      count: reports.filter((r) => r.category === "jalan").length,
      color: "bg-pink-500",
    },
    {
      cat: "Lampu PJU / Mati",
      count: reports.filter((r) => r.category === "lampu").length,
      color: "bg-amber-500",
    },
    {
      cat: "Persampahan / TPS",
      count: reports.filter((r) => r.category === "sampah").length,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
      <h3 className="text-sm font-extrabold text-slate-900 mb-6 flex items-center gap-2">
        <Globe className="h-4.5 w-4.5 text-teal-700" />
        Statistik & Kategori Pengaduan Terbanyak
      </h3>

      <div className="space-y-4">
        {categories.map((item, idx) => {
          const total = reports.length || 1;
          const percentage = Math.round((item.count / total) * 100);
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>{item.cat}</span>
                <span>
                  {item.count} Laporan ({percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${item.color}`}
                  style={{ width: `${Math.max(4, percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* SVG SLA Trend Line Chart */}
      <div className="mt-8 border-t border-slate-200 pt-6">
        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Tren Kecepatan Penyelesaian Dinas (Hari/Kasus)
        </span>
        <div className="w-full h-32 relative">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Area Path */}
            <path
              d="M 0 90 Q 80 50, 160 70 T 320 20 L 400 30 L 400 100 L 0 100 Z"
              fill="url(#chartGrad)"
            />
            {/* Line Path */}
            <path
              d="M 0 90 Q 80 50, 160 70 T 320 20 L 400 30"
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Dots */}
            <circle cx="80" cy="70" r="4" fill="#0f766e" stroke="white" strokeWidth="1.5" />
            <circle cx="160" cy="70" r="4" fill="#0f766e" stroke="white" strokeWidth="1.5" />
            <circle cx="240" cy="40" r="4" fill="#0f766e" stroke="white" strokeWidth="1.5" />
            <circle cx="320" cy="20" r="4" fill="#f59e0b" stroke="white" strokeWidth="1.5" />
          </svg>
          {/* X-Axis labels */}
          <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-2 uppercase">
            <span>Minggu 1</span>
            <span>Minggu 2</span>
            <span>Minggu 3</span>
            <span>Minggu 4 (Aktif)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
