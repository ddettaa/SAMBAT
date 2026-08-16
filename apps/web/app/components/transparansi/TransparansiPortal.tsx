"use client";

import dynamic from "next/dynamic";
import type { Report } from "@/lib/types";
import KpiCards from "./KpiCards";
import SmartExplainer from "./SmartExplainer";
import CategoryChart from "./CategoryChart";
import DinasLeaderboard from "./DinasLeaderboard";

// Leaflet butuh browser — nonaktifkan SSR (hanya boleh di Client Component)
const MapComponent = dynamic(() => import("../MapComponent"), { ssr: false });

interface TransparansiPortalProps {
  reports: Report[];
}

// TAB: Transparansi Publik — KPI, peta sebaran, statistik, leaderboard OPD
export default function TransparansiPortal({ reports }: TransparansiPortalProps) {
  return (
    <div className="space-y-8 max-w-6xl mx-auto h-full flex flex-col">
      <KpiCards reports={reports} />

      {/* Map & Explainer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[480px]">
        {/* Map Panel */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 lg:col-span-2 h-[480px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Peta Sebaran Laporan & Prioritas SMART Kota Banjarmasin
            </h3>
            <div className="flex gap-3 text-[10px] font-bold text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>{" "}
                Kritis
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>{" "}
                Tinggi
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>{" "}
                Sedang
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>{" "}
                Rendah
              </span>
            </div>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-200">
            <MapComponent reports={reports} />
          </div>
        </div>

        <SmartExplainer />
      </div>

      {/* Row 2: Analytics & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CategoryChart reports={reports} />
        <DinasLeaderboard />
      </div>
    </div>
  );
}
