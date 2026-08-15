"use client";

import { useState } from "react";
import { ChevronRight, Info, RefreshCw, Settings, Trash2 } from "lucide-react";
import { demoReset, demoSimulate } from "@/lib/api";

interface DemoControlCenterProps {
  // Dipanggil setelah reset/simulasi berhasil agar data dasbor di-refresh
  onDataChanged: () => void;
  // Dipanggil khusus setelah reset agar state tampilan (mis. tiket terlacak) ikut bersih
  onReset: () => void;
}

const SCENARIOS = [
  { id: "banjar", label: "1. Masuk Aduan (Dialek Banjar)" },
  { id: "duplicate", label: "2. Pengabungan Laporan Serupa" },
  { id: "low_confidence", label: "3. Penyaringan Verifikasi Operator" },
  { id: "sla_escalated", label: "4. Alarm Batas Waktu Dinas (Overdue)" },
];

export default function DemoControlCenter({
  onDataChanged,
  onReset,
}: DemoControlCenterProps) {
  const [simulating, setSimulating] = useState<string | null>(null);

  const handleDemoReset = async () => {
    setSimulating("reset");
    const result = await demoReset();
    if (result.ok) {
      alert("Database berhasil di-reset dan di-seeder awal!");
      onDataChanged();
      onReset();
    } else {
      alert("Gagal reset database.");
    }
    setSimulating(null);
  };

  const handleDemoSimulate = async (scenario: string) => {
    setSimulating(scenario);
    const result = await demoSimulate(scenario);
    if (result.ok) {
      alert(
        `Skenario [${scenario.toUpperCase()}] berhasil disimulasikan! Silakan cek dasbor.`
      );
      onDataChanged();
    } else {
      alert("Gagal simulasi: " + result.error);
    }
    setSimulating(null);
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto relative bg-sasirangan">
      <div className="absolute inset-0 bg-white/96 z-0" />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
            <Settings className="h-5 w-5 text-teal-700 animate-spin-slow" />
            <div>
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">
                Demo Control Center
              </h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                Storyline & Simulasi Lomba
              </p>
            </div>
          </div>

          {/* Action Simulation Buttons */}
          <div className="space-y-3">
            {/* RESET DATABASE */}
            <button
              onClick={handleDemoReset}
              disabled={simulating !== null}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {simulating === "reset" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Reset & Seeder Database
            </button>

            <div className="border-t border-slate-200 my-4 pt-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
                Simulasi Skenario
              </span>

              <div className="space-y-2">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => handleDemoSimulate(scenario.id)}
                    disabled={simulating !== null}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs py-2.5 px-4 rounded-xl text-left transition-all border border-slate-200 flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span className="font-bold">{scenario.label}</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Jukung / Illustration footer */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[10px] text-slate-500 space-y-2 mt-4 font-medium leading-relaxed relative">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="h-3.5 w-3.5 text-teal-700" />
                Alur Demo Tim
              </div>
              <p>
                Klik skenario di atas secara berturut-turut untuk menyimulasikan
                siklus penuh tata kelola keluhan warga secara langsung.
              </p>
              <div className="flex justify-end mt-2 opacity-30 select-none pointer-events-none">
                {/* Wave and Jukung (boat) subtle layout ASCII/Visual symbol */}
                <span className="font-mono text-xs text-teal-700">
                  🛶 ~~~ ~~~
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-bold text-center flex flex-col gap-1">
          <div className="text-slate-600">Gawi Sabumi Tech — 2026</div>
          <div className="tracking-wider text-[9px]">
            Banjarmasin Smart City Ideathon
          </div>
        </div>
      </div>
    </aside>
  );
}
