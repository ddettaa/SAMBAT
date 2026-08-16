"use client";

import { Check, ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getPriorityColor, getSourceUrl } from "@/lib/utils";
import type { ReportDetail, TimelineEvent } from "@/lib/types";

// Leaflet butuh browser
const RepairMap = dynamic(() => import("./RepairMap"), { ssr: false });

interface TicketTrackerProps {
  trackId: string;
  onTrackIdChange: (value: string) => void;
  trackedReport: ReportDetail | null;
  trackedTimeline: TimelineEvent[];
  trackingError: string;
  loading: boolean;
  onTrack: () => void;
}

// Panel "Lacak Status & Transparansi Tiket" — form + artikel editorial.
// Menggunakan shadcn primitives: Input, Label, Button, Badge, Separator, Skeleton.
export default function TicketTracker({
  trackId,
  onTrackIdChange,
  trackedReport,
  trackedTimeline,
  trackingError,
  loading,
  onTrack,
}: TicketTrackerProps) {
  return (
    <div>
      <div className="pb-4">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
          Lacak tiket
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Lihat tahapan penanganan aduanmu secara terbuka.
        </p>
      </div>

      <Separator />

      {/* Form — label di atas input, error di bawah input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onTrack();
        }}
        className="mt-6 space-y-3"
      >
        <div className="space-y-2">
          <Label htmlFor="track-id" className="text-[13px] font-bold text-slate-700">
            ID Tiket
          </Label>
          <div className="flex gap-2">
            <Input
              id="track-id"
              type="text"
              value={trackId}
              onChange={(e) => onTrackIdChange(e.target.value)}
              placeholder="rpt_123456"
              className="flex-1 font-mono text-[13px]"
              required
            />
            <Button type="submit" className="rounded-full px-6 font-bold">
              Lacak
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            ID diberikan sistem saat aduanmu diterima.
          </p>
        </div>
        {trackingError && (
          <p role="alert" className="text-[12px] font-semibold text-red-600">
            {trackingError}
          </p>
        )}
      </form>

      {/* Skeleton loading — bentuk menyerupai hasil akhir */}
      {loading && !trackedReport && (
        <div className="mt-8 space-y-6" aria-hidden>
          <Skeleton className="h-9 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      )}

      {trackedReport && (
        <article className="mt-8 space-y-8">
          {/* Status — kata display besar + badge kategori */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {trackedReport.id}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-3xl font-extrabold capitalize tracking-tighter text-teal-700">
                {trackedReport.status.replaceAll("_", " ")}
              </h3>
              <Badge variant="outline" className="text-[11px] font-bold uppercase">
                {trackedReport.category}
              </Badge>
            </div>
            {getSourceUrl(trackedReport.source, trackedReport.source_ref) && (
              <a
                href={getSourceUrl(trackedReport.source, trackedReport.source_ref)!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-sky-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Lihat postingan asli
              </a>
            )}
          </div>

          <Separator />

          {/* Foto sebelum / sesudah — figure + caption mono */}
          <div className="grid grid-cols-2 gap-4">
            <figure>
              {trackedReport.image_before ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={trackedReport.image_before}
                  className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover"
                  alt="Foto kejadian dari warga"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-400">
                  Tidak ada foto
                </div>
              )}
              <figcaption className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Foto kejadian — warga
              </figcaption>
            </figure>
            <figure>
              {trackedReport.image_after ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={trackedReport.image_after}
                  className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover"
                  alt="Foto perbaikan dari dinas"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-400">
                  Menunggu pengerjaan
                </div>
              )}
              <figcaption className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Foto perbaikan — dinas
              </figcaption>
            </figure>
          </div>

          <Separator />

          {/* Peta lokasi laporan vs perbaikan (jika sudah ada koordinat perbaikan) */}
          {trackedReport.repair_lat && trackedReport.repair_lng && trackedReport.latitude && trackedReport.longitude && (
            <div>
              <p className="text-[13px] font-bold text-slate-700">
                Lokasi Perbaikan
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                Lingkaran teal = lokasi laporan, pin hijau = titik perbaikan.
              </p>
              <div className="mt-2">
                <RepairMap
                  reportLat={trackedReport.latitude}
                  reportLng={trackedReport.longitude}
                  repairLat={trackedReport.repair_lat}
                  repairLng={trackedReport.repair_lng}
                />
              </div>
              <div className="mt-2 flex items-center gap-4 font-mono text-[10px] text-slate-500">
                <span>
                  Laporan:{" "}
                  <strong className="text-teal-700">
                    {trackedReport.latitude.toFixed(5)}, {trackedReport.longitude.toFixed(5)}
                  </strong>
                </span>
                <span>
                  Perbaikan:{" "}
                  <strong className="text-emerald-700">
                    {trackedReport.repair_lat.toFixed(5)}, {trackedReport.repair_lng.toFixed(5)}
                  </strong>
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Laporan & terjemahan */}
          <div>
            <p className="text-[13px] font-bold text-slate-700">
              Laporan asli (Bahasa Banjar)
            </p>
            <blockquote className="mt-2 text-[15px] italic leading-relaxed text-slate-600">
              &ldquo;{trackedReport.text_original}&rdquo;
            </blockquote>
            {trackedReport.text_normalized &&
              trackedReport.text_normalized !== trackedReport.text_original && (
                <>
                  <p className="mt-4 flex items-center gap-1.5 text-[13px] font-bold text-teal-700">
                    <Check className="h-3.5 w-3.5" /> Terjemahan otomatis (AI)
                  </p>
                  <p className="mt-2 text-[15px] font-medium leading-relaxed text-slate-900">
                    &ldquo;{trackedReport.text_normalized}&rdquo;
                  </p>
                </>
              )}
          </div>

          <Separator />

          {/* Skor SMART — garis tipis + angka mono + disclosure */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-bold text-slate-700">
                Skor Prioritas SMART
              </p>
              <span
                className="font-mono text-sm font-extrabold"
                style={{ color: getPriorityColor(trackedReport.priority) }}
              >
                {trackedReport.priority}/100
              </span>
            </div>
            <div className="mt-3 h-1 w-full bg-slate-200">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${trackedReport.priority}%`,
                  backgroundColor: getPriorityColor(trackedReport.priority),
                }}
              />
            </div>
            <details className="group mt-3">
              <summary className="cursor-pointer text-[12px] font-bold text-teal-700 transition-colors hover:text-teal-800">
                Lihat pembobotan SMART
              </summary>
              <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-slate-500">
                <p className="font-bold text-slate-700">P = 30U + 25D + 20V + 15T + 10R</p>
                <p>U (bahaya keamanan) = {trackedReport.priority_detail?.U || 25} — bobot 30%</p>
                <p>D (laporan serupa) = {trackedReport.priority_detail?.D || 25} — bobot 25%</p>
                <p>V (kekuatan bukti) = {trackedReport.priority_detail?.V || 0} — bobot 20%</p>
                <p>T (waktu tunggu) = {trackedReport.priority_detail?.T || 0} — bobot 15%</p>
                <p>R (kerawanan daerah) = {trackedReport.priority_detail?.R || 25} — bobot 10%</p>
              </div>
            </details>
          </div>

          <Separator />

          {/* Timeline — rail kiri */}
          <div>
            <p className="text-[13px] font-bold text-slate-700">
              Perjalanan pengaduan
            </p>
            <ol className="mt-4 space-y-4 border-l-2 border-slate-200 pl-4">
              {trackedTimeline.map((evt, idx) => (
                <li key={idx} className="relative">
                  <span
                    className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-600"
                    aria-hidden
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-bold capitalize text-slate-900">
                      {evt.status.replaceAll("_", " ")}
                    </span>
                    <time className="shrink-0 font-mono text-[10px] text-slate-400">
                      {new Date(evt.created_at).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  {evt.note && (
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                      {evt.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </article>
      )}
    </div>
  );
}
