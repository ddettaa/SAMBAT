"use client";

import { CheckCircle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Report } from "@/lib/types";

interface TriageQueueProps {
  reports: Report[];
  selectedReportId?: string;
  onSelectReport: (report: Report) => void;
}

// Antrean penyaringan & verifikasi AI (aduan ambigu berstatus "terdeteksi")
export default function TriageQueue({
  reports,
  selectedReportId,
  onSelectReport,
}: TriageQueueProps) {
  const pendingReports = reports.filter((r) => r.status === "terdeteksi");

  return (
    <Card className="border-slate-200 shadow-sm lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          Penyaringan & Verifikasi AI (Aduan Ambigu)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[450px] space-y-3 overflow-y-auto pr-2">
          {pendingReports.map((report) => (
            <div
              key={report.id}
              className={`cursor-pointer rounded-2xl border p-4 transition-all hover:bg-slate-50/80 ${
                selectedReportId === report.id
                  ? "border-teal-500/30 bg-teal-50/50"
                  : "border-slate-200 bg-white"
              }`}
              onClick={() => onSelectReport(report)}
            >
              <div className="mb-2 flex items-center justify-between text-[10px]">
                <span className="font-mono font-bold text-slate-500">
                  {report.id}
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-100 bg-amber-50 font-bold text-amber-700"
                >
                  Akurasi AI:{" "}
                  {typeof report.confidence === "number"
                    ? Math.round(report.confidence * 100)
                    : 0}
                  %
                </Badge>
              </div>

              <div className="mb-3 space-y-1.5">
                <p className="text-xs italic text-slate-500">
                  Banjar: &quot;{report.text_original}&quot;
                </p>
                {report.text_normalized &&
                  report.text_normalized !== report.text_original && (
                    <p className="text-xs font-bold text-slate-800">
                      Terjemahan: &quot;{report.text_normalized}&quot;
                    </p>
                  )}
              </div>

              <Separator />

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  Kategori:{" "}
                  <strong className="capitalize text-slate-800">
                    {report.category}
                  </strong>
                </span>
                <span>
                  Prioritas:{" "}
                  <strong className="text-red-600">{report.priority}</strong>
                </span>
              </div>
            </div>
          ))}

          {pendingReports.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
              <CheckCircle className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">
                Semua laporan terverifikasi atau sudah otomatis diteruskan!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
