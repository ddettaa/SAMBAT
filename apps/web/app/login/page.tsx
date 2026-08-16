"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, Check, Compass, Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { fetchDinas } from "@/lib/api";
import { KEYS } from "@/lib/constants";
import { setSession } from "@/lib/session";
import type { Dinas } from "@/lib/types";

type Role = "operator" | "dinas";

const FLOW_STEPS = [
  "Warga melapor",
  "AI memproses",
  "Operator menyaring bila ragu",
  "Dinas menindaklanjuti",
  "Selesai",
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("operator");
  const [dinasList, setDinasList] = useState<Dinas[]>([]);
  const [dinasId, setDinasId] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDinas().then((list) => {
      if (list && list.length > 0) {
        setDinasList(list);
        setDinasId(list[0].id);
      }
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "operator") {
      if (accessKey !== KEYS.operator) {
        setError("Kunci akses operator salah. Silakan coba lagi.");
        return;
      }
      setSession({ role: "operator", label: "Operator" });
      router.replace("/operator");
      return;
    }

    if (!dinasId) {
      setError("Pilih dinas terlebih dahulu.");
      return;
    }
    if (accessKey !== KEYS.dinas) {
      setError("Kunci akses dinas salah. Silakan coba lagi.");
      return;
    }
    const dinas = dinasList.find((d) => d.id === dinasId);
    setSession({
      role: "dinas",
      dinasId,
      label: dinas?.short ?? dinasId.toUpperCase(),
    });
    router.replace("/dinas");
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Header ringkas */}
      <header className="sticky top-0 z-50 flex flex-col border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 sm:px-8 py-4">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700 shadow-sm">
            <Compass className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
              SAMBAT
            </h1>
            <p className="text-[10px] sm:text-xs font-medium text-slate-500">
              Sistem Agen Masyarakat Banjarmasin Tanggap
            </p>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-teal-700 via-sky-500 to-amber-500" />
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border-slate-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700">
              <Lock className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold tracking-tighter text-slate-900">
              Masuk ke dasbor internal
            </CardTitle>
            <CardDescription className="mt-2 text-xs sm:text-sm leading-relaxed">
              Area ini khusus petugas. Warga cukup menggunakan Portal Warga dan
              Transparansi Publik — tanpa akun.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Pilih peran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Pilih peran">
              <button
                type="button"
                onClick={() => {
                  setRole("operator");
                  setError("");
                }}
                aria-pressed={role === "operator"}
                className={`cursor-pointer rounded-xl border p-4 text-left transition active:scale-[0.98] ${
                  role === "operator"
                    ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <ShieldCheck
                  className={`h-5 w-5 ${role === "operator" ? "text-teal-700" : "text-slate-400"}`}
                />
                <span className="mt-2 block text-[13px] font-bold text-slate-900">
                  Operator
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                  Menyaring & memverifikasi aduan yang diragukan AI
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("dinas");
                  setError("");
                }}
                aria-pressed={role === "dinas"}
                className={`cursor-pointer rounded-xl border p-4 text-left transition active:scale-[0.98] ${
                  role === "dinas"
                    ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <Building2
                  className={`h-5 w-5 ${role === "dinas" ? "text-teal-700" : "text-slate-400"}`}
                />
                <span className="mt-2 block text-[13px] font-bold text-slate-900">
                  Dinas
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                  Menindaklanjuti tiket & mengunggah bukti perbaikan
                </span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {role === "dinas" && (
                <div className="space-y-2">
                  <Label htmlFor="dinas-select" className="text-[13px] font-bold text-slate-700">
                    Dinas / OPD
                  </Label>
                  <select
                    id="dinas-select"
                    value={dinasId}
                    onChange={(e) => setDinasId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  >
                    {dinasList.length === 0 && (
                      <option value="" disabled>
                        Memuat daftar dinas...
                      </option>
                    )}
                    {dinasList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.short} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="access-key" className="text-[13px] font-bold text-slate-700">
                  Kunci Akses {role === "operator" ? "Operator" : "Dinas"}
                </Label>
                <Input
                  id="access-key"
                  type="password"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Masukkan kunci akses"
                  className="font-mono tracking-widest"
                  required
                />
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Demo:{" "}
                  <code className="break-all rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                    {role === "operator" ? KEYS.operator : KEYS.dinas}
                  </code>
                </p>
                {error && (
                  <p role="alert" className="text-[12px] font-semibold text-red-600">
                    {error}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full rounded-full font-bold">
                Masuk sebagai {role === "operator" ? "Operator" : "Dinas"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <Separator className="mt-6" />

            {/* Flow explainer — menjawab "siapa melakukan apa" */}
            <div className="mt-6">
              <p className="text-[13px] font-bold text-slate-700">
                Alur kerja sistem
              </p>
              <ol className="mt-3 space-y-2">
                {FLOW_STEPS.map((step, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-[12px] text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal-100 bg-teal-50 font-mono text-[10px] font-bold text-teal-700">
                      {idx + 1}
                    </span>
                    {step}
                    {idx === FLOW_STEPS.length - 1 && (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
