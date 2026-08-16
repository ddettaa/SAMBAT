"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CircleDot,
  ImagePlus,
  Loader2,
  MapPin,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { updateReportStatus } from "@/lib/api";
import { getStatusBadgeClass } from "@/lib/utils";
import type { Dinas, Report } from "@/lib/types";
import SlaCountdown from "../SlaCountdown";

// Leaflet butuh browser — nonaktifkan SSR
const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false });

interface DinasPortalProps {
  reports: Report[];
  dinasList: Dinas[];
  dinasId: string;
  onDataChanged: () => void;
}

// ─── Design read: internal tool dinas, trust-first, density 5 ───
// Editorial pipeline rows — bukan generic cards.
// Pipeline: Diterima → Dikerjakan → Selesai (dengan pin lokasi + foto bukti).

type Step = 1 | 2 | 3;

const STEP_META: Record<Step, { label: string; icon: typeof Building2 }> = {
  1: { label: "Diterima", icon: Building2 },
  2: { label: "Dikerjakan", icon: Wrench },
  3: { label: "Selesai", icon: CheckCircle2 },
};

export default function DinasPortal({
  reports,
  dinasList,
  dinasId,
  onDataChanged,
}: DinasPortalProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [fixLat, setFixLat] = useState<number>(0);
  const [fixLng, setFixLng] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dinas = dinasList.find((d) => d.id === dinasId);
  const dinasShort = dinas?.short ?? dinasId.toUpperCase();
  const dinasFull = dinas?.name ?? dinasId;

  const tasks = reports.filter(
    (r) => r.dinas_id === dinasId && ["diteruskan", "dikerjakan"].includes(r.status)
  );
  const doneCount = reports.filter(
    (r) => r.dinas_id === dinasId && r.status === "selesai"
  ).length;

  const resetCompletion = () => {
    setCompletingId(null);
    setProofPhoto(null);
    setProofPreview(null);
    setFixLat(0);
    setFixLng(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAction = async (reportId: string, status: string, note: string, imageAfter?: string) => {
    setBusy(reportId);
    const result = await updateReportStatus(reportId, status, note, imageAfter);
    if (result.ok) {
      resetCompletion();
      onDataChanged();
    } else {
      alert("Gagal: " + result.error);
    }
    setBusy(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") setProofPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleComplete = async (report: Report) => {
    if (!proofPhoto) {
      alert("Unggah foto bukti perbaikan terlebih dahulu.");
      return;
    }
    const lat = fixLat || report.latitude || 0;
    const lng = fixLng || report.longitude || 0;
    const note = `Diselesaikan oleh ${dinasShort}. Lokasi perbaikan: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    await handleAction(report.id, "selesai", note, proofPhoto);
  };

  // Langkah saat ini berdasarkan status
  const getStep = (status: string): Step => {
    if (status === "diteruskan") return 1;
    if (status === "dikerjakan") return 2;
    return 3;
  };
  // NOTE: getStep "selesai" juga return 3 — pipeline indikator penuh hijau

  return (
    <div className="mx-auto max-w-5xl">
      {/* ─── Header: dinas identity + ringkasan ─── */}
      <div className="border-b-2 border-slate-900 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">
              Antrean Tugas Operasional
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tighter text-slate-900">
              {dinasShort}
            </h2>
            <p className="mt-0.5 max-w-[60ch] text-sm leading-relaxed text-slate-500">
              {dinasFull} — tiket yang diteruskan ke OPD ini, baik otomatis oleh
              AI maupun manual oleh operator.
            </p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="block text-2xl font-extrabold text-teal-700">{tasks.length}</span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Aktif
              </span>
            </div>
            <div>
              <span className="block text-2xl font-extrabold text-emerald-600">{doneCount}</span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Selesai
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Task list — editorial rows ─── */}
      <div className="mt-8 space-y-6">
        {tasks.length > 0 ? (
          tasks.map((report) => {
            const step = getStep(report.status);
            const isCompleting = completingId === report.id;

            return (
              <article
                key={report.id}
                className="border-l-2 border-slate-900 pl-6"
              >
                {/* Row 1: ID + status + SLA */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    {report.id}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${getStatusBadgeClass(report.status)}`}
                  >
                    {report.status.replaceAll("_", " ")}
                  </Badge>
                  <SlaCountdown slaDue={report.sla_due} />
                  <span className="ml-auto font-mono text-[10px] text-slate-400">
                    Prioritas {report.priority}/100
                  </span>
                </div>

                {/* Row 2: aduan */}
                <blockquote className="mt-3 text-[15px] font-semibold leading-snug text-slate-900">
                  &ldquo;{report.text_normalized || report.text_original}&rdquo;
                </blockquote>
                <p className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {report.location_text || "Banjarmasin"}
                  {report.kelurahan && (
                    <span className="text-slate-400">
                      · Kel. {report.kelurahan}
                      {report.kecamatan ? `, Kec. ${report.kecamatan}` : ""}
                    </span>
                  )}
                </p>

                {/* Row 3: foto bukti awal (jika ada) */}
                {report.image_before && (
                  <figure className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.image_before}
                      className="h-20 w-32 rounded-lg border border-slate-200 object-cover"
                      alt="Bukti awal dari warga"
                    />
                    <figcaption className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                      Bukti awal — warga
                    </figcaption>
                  </figure>
                )}

                {/* Pipeline indicator */}
                <div className="mt-4 flex items-center gap-2">
                  {([1, 2, 3] as Step[]).map((s, idx) => {
                    const meta = STEP_META[s];
                    const Icon = meta.icon;
                    const isActive = step === s;
                    const isDone = step > s;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        {idx > 0 && (
                          <span className={`h-px w-6 ${isDone || isActive ? "bg-teal-600" : "bg-slate-300"}`} />
                        )}
                        <span
                          className={`flex items-center gap-1.5 text-[11px] font-bold ${
                            isDone ? "text-emerald-600" : isActive ? "text-teal-700" : "text-slate-300"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                              isDone
                                ? "border-emerald-300 bg-emerald-50"
                                : isActive
                                  ? "border-teal-300 bg-teal-50"
                                  : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                          </span>
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action area */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {report.status === "diteruskan" && (
                    <Button
                      size="sm"
                      disabled={busy === report.id}
                      onClick={() =>
                        handleAction(
                          report.id,
                          "dikerjakan",
                          `Divalidasi & dikerjakan oleh ${dinasShort}`
                        )
                      }
                      className="font-bold"
                    >
                      {busy === report.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      Validasi &amp; Ambil Tugas
                    </Button>
                  )}

                  {report.status === "dikerjakan" && !isCompleting && (
                    <Button
                      size="sm"
                      disabled={busy === report.id}
                      onClick={() => {
                        setCompletingId(report.id);
                        setProofPhoto(null);
                        setProofPreview(null);
                        setFixLat(report.latitude ?? -3.3194);
                        setFixLng(report.longitude ?? 114.5908);
                      }}
                      className="font-bold"
                    >
                      <CircleDot className="h-3.5 w-3.5" />
                      Selesaikan &amp; Unggah Bukti
                    </Button>
                  )}
                </div>

                {/* Completion panel: foto + pin lokasi perbaikan */}
                {report.status === "dikerjakan" && isCompleting && (
                  <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4">
                    <p className="text-[13px] font-bold text-teal-800">
                      Bukti Perbaikan
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                      Unggah foto hasil perbaikan dan pin lokasi pekerjaan.
                    </p>

                    <Separator className="my-3 bg-teal-200" />

                    {/* Foto upload */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id={`proof-${report.id}`}
                    />
                    {proofPreview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proofPreview}
                          className="h-36 w-full rounded-lg border border-slate-200 object-cover"
                          alt="Preview bukti perbaikan"
                        />
                        <button
                          onClick={() => {
                            setProofPhoto(null);
                            setProofPreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="absolute right-2 top-2 cursor-pointer rounded-full border border-slate-200 bg-white/90 p-1.5 text-slate-500 hover:text-red-600"
                          aria-label="Hapus foto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor={`proof-${report.id}`}
                        className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400 transition-colors hover:border-teal-500 hover:text-teal-600"
                      >
                        <ImagePlus className="h-6 w-6" />
                        <span className="text-[12px] font-bold">
                          Pilih foto hasil perbaikan
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Foto lapangan setelah dikerjakan
                        </span>
                      </label>
                    )}

                    {/* Pin lokasi perbaikan — drag & drop di peta */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
                          <MapPin className="h-3.5 w-3.5 text-orange-600" />
                          Lokasi Perbaikan
                        </p>
                        <button
                          type="button"
                          className="cursor-pointer font-mono text-[10px] font-bold text-teal-700 hover:underline"
                          onClick={() => {
                            setFixLat(report.latitude ?? -3.3194);
                            setFixLng(report.longitude ?? 114.5908);
                          }}
                        >
                          Reset ke lokasi laporan
                        </button>
                      </div>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                        Geser pin oranye atau klik peta untuk menandai titik
                        perbaikan. Lingkaran teal = lokasi laporan warga.
                      </p>

                      <div className="mt-2">
                        <LocationPicker
                          lat={fixLat}
                          lng={fixLng}
                          onChange={(newLat, newLng) => {
                            setFixLat(newLat);
                            setFixLng(newLng);
                          }}
                          reportLat={report.latitude}
                          reportLng={report.longitude}
                        />
                      </div>

                      {/* Koordinat live — update real-time saat drag */}
                      <div className="mt-2 flex items-center gap-4 font-mono text-[10px] text-slate-500">
                        <span>
                          Lat:{" "}
                          <strong className="text-slate-800">
                            {fixLat ? fixLat.toFixed(5) : "—"}
                          </strong>
                        </span>
                        <span>
                          Lng:{" "}
                          <strong className="text-slate-800">
                            {fixLng ? fixLng.toFixed(5) : "—"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={() => handleComplete(report)}
                        disabled={busy === report.id || !proofPhoto}
                        className="flex-1 font-bold"
                      >
                        {busy === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Kirim &amp; Tutup Tiket
                      </Button>
                      <Button
                        onClick={resetCompletion}
                        variant="outline"
                        className="font-bold"
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}

                <Separator className="mt-6" />
              </article>
            );
          })
        ) : (
          /* ─── Empty state — komposisi bermakna, bukan card kosong ─── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="mt-5 text-lg font-extrabold tracking-tight text-slate-900">
              Semua tugas tuntas
            </h3>
            <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-slate-500">
              Tidak ada tiket aktif untuk {dinasShort}. Tiket baru akan muncul
              di sini begitu diteruskan oleh AI atau operator.
            </p>
            <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              {doneCount} tiket selesai oleh {dinasShort}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
