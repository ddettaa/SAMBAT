import type { Report } from "@/lib/types";

interface KpiCardsProps {
  reports: Report[];
}

// Kartu KPI agregat untuk Transparansi Publik
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
      desc: "Dikonfirmasi warga",
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5"
        >
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
            {metric.label}
          </span>
          <span className={`text-2xl font-extrabold ${metric.color} mt-1 block`}>
            {metric.val}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium">
            {metric.desc}
          </span>
        </div>
      ))}
    </div>
  );
}
