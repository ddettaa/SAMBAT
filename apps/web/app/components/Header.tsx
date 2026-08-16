"use client";

import { BarChart3, Building2, Compass, Megaphone, ShieldCheck } from "lucide-react";

export const TABS = [
  { id: "warga", label: "Portal Warga", icon: Megaphone },
  { id: "operator", label: "Dasbor Operator", icon: ShieldCheck },
  { id: "dinas", label: "Tugas Dinas", icon: Building2 },
  { id: "transparansi", label: "Transparansi Publik", icon: BarChart3 },
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <img src="/sambat-logo.jpg" className="w-full h-full object-cover" alt="SAMBAT Logo" />
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
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
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
