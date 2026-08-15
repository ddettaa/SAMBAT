import { AlertTriangle, Building, CheckCircle, FileText } from "lucide-react";
import type { Case, Report } from "@/lib/types";

interface StatsCardsProps {
  reports: Report[];
  cases: Case[];
}

// Kartu ringkasan statistik di Dasbor Operator
export default function StatsCards({ reports, cases }: StatsCardsProps) {
  const stats = [
    {
      label: "Total Pengaduan",
      val: reports.length,
      icon: FileText,
      color: "text-teal-700",
      bg: "bg-teal-50",
    },
    {
      label: "Aduan Perlu Verifikasi",
      val: reports.filter(
        (r) =>
          typeof r.confidence === "number" &&
          r.confidence < 0.8 &&
          r.status === "terdeteksi"
      ).length,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Kasus Kolektif Aktif",
      val: cases.length,
      icon: Building,
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      label: "Penyelesaian Selesai",
      val: reports.filter((r) => r.status === "selesai").length,
      icon: CheckCircle,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              {stat.label}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
              {stat.val}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shadow-inner`}>
            <stat.icon className="h-6 w-6" />
          </div>
        </div>
      ))}
    </div>
  );
}
