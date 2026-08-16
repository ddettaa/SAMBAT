"use client";

import { Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <Globe className="h-4 w-4 text-teal-700" />
        Statistik & Kategori Pengaduan Terbanyak
      </h3>

      <div className="mt-6 space-y-4">
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
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${item.color}`}
                  style={{ width: `${Math.max(4, percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Separator className="my-6" />

      {/* SVG SLA Trend Line Chart */}
      <div>
        <span className="mb-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Tren Kecepatan Penyelesaian Dinas (Hari/Kasus)
        </span>
        <div className="relative h-32 w-full">
          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 90 Q 80 50, 160 70 T 320 20 L 400 30 L 400 100 L 0 100 Z"
              fill="url(#chartGrad)"
            />
            <path
              d="M 0 90 Q 80 50, 160 70 T 320 20 L 400 30"
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="80" cy="70" r="4" fill="#0f766e" stroke="white" strokeWidth="1.5" />
            <circle cx="160" cy="70" r="4" fill="#0f766e" stroke="white" strokeWidth="1.5" />
            <circle cx="240" cy="40" r="4" fill="#0f766e" stroke="white" strokeWidth="1.5" />
            <circle cx="320" cy="20" r="4" fill="#f59e0b" stroke="white" strokeWidth="1.5" />
          </svg>
          <div className="mt-2 flex justify-between font-mono text-[9px] uppercase text-slate-400">
            <span>Mg 1</span>
            <span>Mg 2</span>
            <span>Mg 3</span>
            <span>Mg 4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
