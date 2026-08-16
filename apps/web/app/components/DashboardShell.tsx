"use client";

import { useState } from "react";
import { useSambatData } from "@/hooks/useSambatData";
import Header from "./Header";
import WargaPortal from "./warga/WargaPortal";
import TransparansiPortal from "./transparansi/TransparansiPortal";

// Orkestrator portal publik: tab navigation + data polling.
// Dasbor Operator & Dinas sengaja dipisah ke route /operator dan /dinas
// agar wajah publik hanya berisi Portal Warga + Transparansi Publik.
export default function DashboardShell() {
  const [activeTab, setActiveTab] = useState<string>("warga");
  const { reports } = useSambatData(10000);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-slate-50 text-slate-800 font-sans antialiased">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1">
        {activeTab === "warga" && <WargaPortal reports={reports} />}

        {activeTab === "transparansi" && <TransparansiPortal reports={reports} />}
      </main>
    </div>
  );
}
