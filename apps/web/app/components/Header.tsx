"use client";

import { BarChart3, LogIn, Megaphone } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const TABS = [
  { id: "warga", label: "Portal Warga", icon: Megaphone },
  { id: "transparansi", label: "Transparansi Publik", icon: BarChart3 },
] as const;

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex flex-col border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-3 sm:py-4">
        <div className="flex items-center gap-4 lg:gap-8 min-w-0">
          <Link
            href="/"
            onClick={() => onTabChange("warga")}
            className="flex items-center gap-2 sm:gap-3 shrink-0"
          >
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              <img src="/sambat-logo.jpg" className="w-full h-full object-cover" alt="SAMBAT Logo" />
            </div>
            <div className="hidden xs:block sm:block">
              <h1 className="flex items-center gap-2 text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
                SAMBAT
                <span className="hidden md:inline-flex rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                  Smart Governance
                </span>
              </h1>
              <p className="hidden md:block text-xs font-medium text-slate-500">
                Sistem Agen Masyarakat Banjarmasin Tanggap
              </p>
            </div>
          </Link>

          {/* Public Tabs Navigation */}
          <nav className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:p-1.5 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex whitespace-nowrap cursor-pointer items-center gap-1.5 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold transition-all",
                  activeTab === tab.id
                    ? "border border-slate-200 bg-white text-teal-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Akses petugas — login terpusat */}
        <Link
          href="/login"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-bold text-white transition hover:bg-slate-700 active:scale-[0.98]"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span className="hidden xs:inline sm:inline">Masuk</span>
        </Link>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-teal-700 via-sky-500 to-amber-500" />
    </header>
  );
}
