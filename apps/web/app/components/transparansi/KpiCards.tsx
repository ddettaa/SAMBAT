"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Report } from "@/lib/types";

interface KpiCardsProps {
  reports: Report[];
}

// Kartu KPI agregat untuk Transparansi Publik — pakai shadcn Card
export default function KpiCards({ reports }: KpiCardsProps) {
  const metrics = [
    {
      label: "Total Keluhan Warga",
      val: reports.length,
      desc: "Seluruh aduan terdaftar",
      color: "text-teal-700",
    },
    {
      label: "Sedang Dikerjakan Dinas",
      val: reports.filter((r) =>
        ["diteruskan", "dikerjakan"].includes(r.status)
      ).length,
      desc: "Penugasan aktif OPD",
      color: "text-amber-600",
    },
    {
      label: "Selesai Penanganan",
      val: reports.filter((r) => r.status === "selesai").length,
      desc: "Ditutup oleh dinas",
      color: "text-emerald-700",
    },
    {
      label: "Ketepatan Waktu Dinas",
      val:
        reports.length > 0
          ? `${Math.round(
              (reports.filter(
                (r) =>
                  r.status === "selesai" ||
                  (r.sla_due && new Date(r.sla_due) > new Date())
              ).length /
                reports.length) *
                100
            )}%`
          : "100%",
      desc: "Respons sesuai target waktu",
      color: "text-sky-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((metric, idx) => (
        <Card key={idx} className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {metric.label}
            </span>
            <span className={`mt-1 block text-2xl font-extrabold ${metric.color}`}>
              {metric.val}
            </span>
            <span className="mt-1 block text-[10px] font-medium text-slate-400">
              {metric.desc}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
