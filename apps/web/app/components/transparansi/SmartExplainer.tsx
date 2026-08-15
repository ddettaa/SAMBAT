import { Info } from "lucide-react";

// Panel penjelasan metode transparansi SMART
export default function SmartExplainer() {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden bg-sasirangan">
      <div className="absolute inset-0 bg-white/95 z-0" />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-1.5">
            <Info className="h-4.5 w-4.5 text-teal-700" />
            Metode Transparansi SMART
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Prioritas penanganan keluhan dihitung secara terbuka menggunakan
            metode **SMART (Simple Multi-Attribute Rating Technique)** berbasis
            penelitian. Kami menghapus intervensi birokrasi subyektif agar
            alokasi APBD adil bagi warga kota.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-600 space-y-2">
            <div className="font-extrabold text-slate-900 text-xs border-b border-slate-200 pb-1.5 mb-2">
              P = 30U + 25D + 20V + 15T + 10R
            </div>
            <div>• **U** (30%): Tingkat Bahaya Keamanan (Urgensi)</div>
            <div>• **D** (25%): Jumlah Aduan Serupa (Laporan Berulang)</div>
            <div>• **V** (20%): Kelengkapan Foto & Peta (Validitas Bukti)</div>
            <div>• **T** (15%): Lama Keluhan Tertunda (Waktu Tunggu)</div>
            <div>• **R** (10%): Kerawanan Dampak Wilayah (Geoportal)</div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 italic leading-normal">
          *Kalkulasi prioritas dilakukan secara langsung di dalam database
          PostgreSQL melalui query PostGIS + AI Analisis setiap kali aduan baru
          masuk.
        </div>
      </div>
    </div>
  );
}
