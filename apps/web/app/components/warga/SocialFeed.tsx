"use client";

import { ChevronRight, Globe, Sailboat } from "lucide-react";
import { getCategoryBadgeClass } from "@/lib/utils";
import type { Report } from "@/lib/types";

interface SocialFeedProps {
  reports: Report[];
  onSelectReport: (reportId: string) => void;
}

// Live Social Listening Feed — marquee vertikal aduan dari media sosial
export default function SocialFeed({ reports, onSelectReport }: SocialFeedProps) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden bg-sasirangan h-[650px]">
      <div className="absolute inset-0 bg-white/95 z-0" />
      <div className="relative z-10 flex flex-col h-full justify-between overflow-hidden">
        {/* Header Feed */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Globe className="h-4.5 w-4.5 text-teal-700 animate-pulse" />
              Live Social Listening Feed
            </h2>
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{" "}
              Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Laporan yang ditangkap otomatis oleh AI Agen SAMBAT dari mention dan
            pesan media sosial warga (X, Instagram, WhatsApp).
          </p>
        </div>

        {/* Marquee Vertical Scrolling Container */}
        <div className="flex-1 overflow-hidden relative border border-slate-100 rounded-xl bg-slate-50/50 p-2">
          {/* Top/Bottom Fade effects for premium layout */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-slate-100/90 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-100/90 to-transparent z-20 pointer-events-none" />

          <div className="h-full overflow-hidden relative">
            {reports.length > 0 ? (
              <div className="space-y-4 animate-marquee-vertical absolute w-full">
                {/* Duplicate items to achieve infinite loop */}
                {[...reports, ...reports, ...reports].map((report, idx) => {
                  const name = report.reporter_pseudo || "Warga Banjarmasin";
                  const handle = `@${name.toLowerCase().replace(/\s+/g, "_")}`;

                  return (
                    <div
                      key={`${report.id}-${idx}`}
                      onClick={() => onSelectReport(report.id)}
                      className="bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-500 shadow-sm transition-all cursor-pointer hover:shadow-md relative overflow-hidden group pointer-events-auto"
                    >
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-600 to-sky-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />

                      <div className="flex gap-3">
                        {/* Avatar using dicebear */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${name}`}
                          className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 flex-shrink-0"
                          alt="Avatar"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-slate-900 text-xs truncate">
                                {name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium ml-1.5">
                                {handle}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(report.created_at).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full text-white ${
                                report.source === "x"
                                  ? "bg-slate-900"
                                  : report.source === "whatsapp"
                                    ? "bg-emerald-500"
                                    : "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500"
                              }`}
                            >
                              {report.source === "x"
                                ? "X / TWITTER"
                                : report.source.toUpperCase()}
                            </span>
                            <span
                              className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase border ${getCategoryBadgeClass(report.category)}`}
                            >
                              {report.category}
                            </span>
                          </div>

                          <p className="text-xs text-slate-800 font-semibold mt-2.5 leading-relaxed">
                            {report.text_original}
                          </p>

                          {report.text_normalized &&
                            report.text_normalized !== report.text_original && (
                              <div className="mt-2 p-2 bg-teal-50/40 border border-teal-100/50 rounded-lg text-[10px] text-slate-600 font-medium italic">
                                <span className="text-teal-700 font-extrabold uppercase not-italic block text-[8px] tracking-wider mb-0.5">
                                  Terjemahan AI:
                                </span>
                                &quot;{report.text_normalized}&quot;
                              </div>
                            )}

                          <div className="mt-3 flex justify-between items-center text-[10px] text-slate-400">
                            <span>
                              ID:{" "}
                              <code className="font-mono font-bold text-slate-600">
                                {report.id}
                              </code>
                            </span>
                            <span className="text-teal-700 font-bold group-hover:underline flex items-center gap-0.5">
                              Lacak <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-24 text-slate-400 text-xs">
                Belum ada aduan masuk.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-3 flex-shrink-0 font-medium">
          <span>
            *Klik aduan untuk melacak perjalanan penanganannya secara langsung.
          </span>
          <span className="font-mono text-teal-700 font-bold flex items-center gap-1">
            <Sailboat className="h-3.5 w-3.5" /> sambat.bjm
          </span>
        </div>
      </div>
    </div>
  );
}
