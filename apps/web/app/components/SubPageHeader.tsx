"use client";

import Link from "next/link";
import { ArrowLeft, Compass, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubPageHeaderProps {
  title: string;
  sessionLabel?: string;
  onLogout?: () => void;
}

// Header untuk halaman internal (/operator, /dinas) — brand + status sesi + keluar
export default function SubPageHeader({
  title,
  sessionLabel,
  onLogout,
}: SubPageHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex flex-col border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700 shadow-sm">
            <Compass className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-sm sm:text-base font-extrabold tracking-tight text-slate-900 truncate">
              SAMBAT
              <span className="hidden sm:inline-flex rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                {title}
              </span>
            </h1>
            <p className="hidden md:block text-xs font-medium text-slate-500">
              Sistem Agen Masyarakat Banjarmasin Tanggap
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            href="/"
            className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-teal-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Portal Publik
          </Link>
          {sessionLabel && (
            <span className="rounded-full border border-teal-100 bg-teal-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
              {sessionLabel}
            </span>
          )}
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="outline"
              className="rounded-full border-red-200 bg-red-50 text-[10px] sm:text-[11px] font-bold text-red-600 hover:bg-red-100 hover:text-red-700 px-2.5 sm:px-4"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          )}
        </div>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-teal-700 via-sky-500 to-amber-500" />
    </header>
  );
}
