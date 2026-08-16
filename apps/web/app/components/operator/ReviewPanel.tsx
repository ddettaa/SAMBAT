"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DINAS_BY_CATEGORY, DEFAULT_DINAS_ID } from "@/lib/constants";
import type { Dinas, Report } from "@/lib/types";

interface ReviewPanelProps {
  report: Report | null;
  dinasList: Dinas[];
  loading: boolean;
  message: string;
  onSubmit: (dinasId: string) => void;
}

// Panel verifikasi manual — koreksi kategori & pilih dinas penerima.
// Beri prop `key={report.id}` dari parent agar form ter-reset tiap ganti laporan.
export default function ReviewPanel({
  report,
  dinasList,
  loading,
  message,
  onSubmit,
}: ReviewPanelProps) {
  const defaultDinas =
    (report && DINAS_BY_CATEGORY[report.category]) || DEFAULT_DINAS_ID;
  const [selectedDinas, setSelectedDinas] = useState(defaultDinas);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-extrabold text-slate-900">
          Panel Verifikasi Manual
        </CardTitle>
      </CardHeader>
      <CardContent>
        {report ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Isi Aduan
              </span>
              <p className="text-xs italic text-slate-700">
                &quot;{report.text_original}&quot;
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dinas-select" className="text-xs font-bold text-slate-600">
                Dinas Penerima
              </Label>
              <select
                id="dinas-select"
                value={selectedDinas}
                onChange={(e) => setSelectedDinas(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {dinasList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.short} — {d.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => onSubmit(selectedDinas)}
              disabled={loading}
              className="w-full font-bold"
            >
              <Check className="h-4 w-4" />
              Tembuskan ke Dinas
            </Button>

            {message && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-700">
                {message}
              </p>
            )}
          </div>
        ) : (
          <div className="py-24 text-center text-xs font-medium text-slate-400">
            Pilih salah satu laporan di antrean sebelah kiri untuk melakukan
            review visual manual.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
