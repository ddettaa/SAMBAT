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
    <div className="mx-auto flex h-full max-w-6xl flex-col space-y-8">
      <KpiCards reports={reports} />

      {/* Map & Explainer */}
      <div className="grid min-h-[480px] flex-1 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Map Panel — layer control & legend sudah built-in di MapComponent */}
        <div className="flex h-[420px] flex-col lg:col-span-2 lg:h-[520px]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Peta Sebaran Laporan & Risiko — Kota Banjarmasin
            </h3>
          </div>
          <div className="flex-1 overflow-hidden rounded-xl border border-slate-200">
            <MapComponent reports={reports} />
          </div>
        </div>

        <SmartExplainer />
      </div>

      {/* Row 2: Analytics & Leaderboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <CategoryChart reports={reports} />
        <DinasLeaderboard reports={reports} />
      </div>
    </div>
  );
}
