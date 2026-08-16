"use client";

import { Building2, CheckCircle, FileText, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
      icon: ShieldAlert,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Kasus Kolektif Aktif",
      val: cases.length,
      icon: Building2,
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
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat, idx) => (
        <Card key={idx} className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {stat.label}
              </span>
              <span className="mt-1 block text-2xl font-extrabold text-slate-900">
                {stat.val}
              </span>
            </div>
            <div className={`rounded-xl p-3 shadow-inner ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
