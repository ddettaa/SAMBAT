"use client";

import { useState } from "react";
import { useSambatData } from "@/hooks/useSambatData";
import Header from "./Header";
import DemoControlCenter from "./DemoControlCenter";
import WargaPortal from "./warga/WargaPortal";
import OperatorDashboard from "./operator/OperatorDashboard";
import DinasPortal from "./dinas/DinasPortal";
import TransparansiPortal from "./transparansi/TransparansiPortal";

// Orkestrator utama: tab navigation + data polling + panel demo
export default function DashboardShell() {
  const [activeTab, setActiveTab] = useState<string>("warga");
  const { reports, cases, dinasList, refresh } = useSambatData(10000);

  // Dinaikkan saat demo reset -> Portal Warga di-remount agar tiket
  // yang sedang dilacak ikut bersih (state lokal ter-reset)
  const [wargaSessionKey, setWargaSessionKey] = useState(0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans antialiased">
      {/* ─── LEFT PANEL (75% Width) ─── */}
      <div className="flex flex-1 flex-col h-full overflow-hidden border-r border-slate-200">
        <Header activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {activeTab === "warga" && (
            <WargaPortal
              key={wargaSessionKey}
              reports={reports}
              onDataChanged={refresh}
            />
          )}

          {activeTab === "operator" && (
            <OperatorDashboard
              reports={reports}
              cases={cases}
              dinasList={dinasList}
              onDataChanged={refresh}
            />
          )}

          {activeTab === "dinas" && (
            <DinasPortal
              reports={reports}
              dinasList={dinasList}
              onDataChanged={refresh}
            />
          )}

          {activeTab === "transparansi" && (
            <TransparansiPortal reports={reports} />
          )}
        </main>
      </div>

      {/* ─── RIGHT PANEL: DEMO CONTROL CENTER (25% Width) ─── */}
      <DemoControlCenter
        onDataChanged={refresh}
        onReset={() => setWargaSessionKey((k) => k + 1)}
      />
    </div>
  );
}
