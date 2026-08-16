"use client";

import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getCategoryBadgeClass, getSourceUrl } from "@/lib/utils";
import type { Report } from "@/lib/types";

interface SocialFeedProps {
  reports: Report[];
  onSelectReport: (reportId: string) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  x: "X / Twitter",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  web: "Web",
};

// Aliran aduan live — baris editorial divide-y (tanpa card),
// marquee vertikal adalah satu-satunya elemen bergerak di halaman.
// Setiap baris menampilkan avatar, badge kategori, dan link ke postingan asli.
export default function SocialFeed({ reports, onSelectReport }: SocialFeedProps) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-4">
        <div>
          <h2 className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900">
            Aduan terkini
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </h2>
          <p className="mt-1.5 max-w-[55ch] text-sm leading-relaxed text-slate-500">
            Ditangkap otomatis oleh AI dari mention media sosial warga — X,
            Instagram, WhatsApp.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 border-emerald-200 bg-emerald-50">
          Live
        </Badge>
      </div>

      <Separator className="mb-2" />

      {/* Viewport marquee dengan fade atas/bawah */}
      <div className="relative h-[560px] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b from-white to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-white to-transparent" />

        {reports.length > 0 ? (
          <div className="animate-marquee-vertical absolute w-full">
            {/* Item digandakan untuk loop tak berujung */}
            {[...reports, ...reports, ...reports].map((report, idx) => {
              const name = report.reporter_pseudo || "Warga Banjarmasin";
              const sourceUrl = getSourceUrl(report.source, report.source_ref);
              const sourceLabel = SOURCE_LABEL[report.source] ?? report.source;

              return (
                <button
                  key={`${report.id}-${idx}`}
                  onClick={() => onSelectReport(report.id)}
                  className="group block w-full cursor-pointer border-b border-slate-200 px-2 py-5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0 border border-slate-200">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${name}`}
                        alt={name}
                      />
                      <AvatarFallback className="text-[10px] font-bold">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
                          {name}
                        </span>
                        <time className="font-mono text-[11px] text-slate-400">
                          {new Date(report.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[8px] font-extrabold uppercase ${getCategoryBadgeClass(report.category)}`}
                        >
                          {report.category}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[8px] font-extrabold uppercase text-white"
                        >
                          {sourceLabel}
                        </Badge>
                      </div>

                      <p className="mt-2 text-[15px] font-semibold leading-snug text-slate-900">
                        {report.text_original}
                      </p>

                      {report.text_normalized &&
                        report.text_normalized !== report.text_original && (
                          <p className="mt-1.5 text-[13px] italic leading-relaxed text-slate-500">
                            &ldquo;{report.text_normalized}&rdquo;
                          </p>
                        )}

                      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-slate-400">
                        <span className="flex items-center gap-2">
                          {report.id}
                          {sourceUrl && (
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 font-sans font-bold text-sky-600 hover:underline"
                              aria-label={`Lihat postingan asli di ${sourceLabel}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Postingan asli
                            </a>
                          )}
                        </span>
                        <span className="font-sans font-bold text-teal-700 opacity-0 transition-opacity group-hover:opacity-100">
                          Lacak &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-bold text-slate-400">
              Belum ada aduan masuk
            </p>
            <p className="max-w-[40ch] text-xs leading-relaxed text-slate-400">
              Aduan dari media sosial akan muncul di sini begitu ditangkap AI.
            </p>
          </div>
        )}
      </div>

      <Separator className="mt-4" />
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Klik salah satu aduan untuk melacak perjalanan penanganannya secara
        langsung.
      </p>
    </div>
  );
}
