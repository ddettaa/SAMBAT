"use client";

import { Compass } from "lucide-react";

export const TABS = [
  { id: "warga", label: "📢 Portal Warga" },
  { id: "operator", label: "🛡️ Dasbor Operator" },
  { id: "dinas", label: "🏢 Tugas Dinas" },
  { id: "transparansi", label: "📊 Transparansi Publik" },
] as const;

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="flex flex-col border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100 shadow-sm">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              SAMBAT
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                Smart Governance
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Sistem Agen Masyarakat Banjarmasin Tanggap
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      {/* River Waves Line Decoration */}
      <div className="w-full h-1 bg-gradient-to-r from-teal-700 via-sky-500 to-amber-500" />
    </header>
  );
}
