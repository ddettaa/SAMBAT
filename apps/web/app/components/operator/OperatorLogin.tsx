"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { KEYS } from "@/lib/constants";

interface OperatorLoginProps {
  onSuccess: () => void;
}

// Gerbang otentikasi sederhana untuk Dasbor Operator
export default function OperatorLogin({ onSuccess }: OperatorLoginProps) {
  const [operatorKeyInput, setOperatorKeyInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (operatorKeyInput === KEYS.operator) {
      setLoginError("");
      onSuccess();
    } else {
      setLoginError("Kunci akses salah! Silakan coba lagi.");
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 shadow-xl rounded-3xl p-8 relative overflow-hidden bg-sasirangan">
      <div className="absolute inset-0 bg-white/95 z-0" />
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Lock Icon Pulsing */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-md mb-6 animate-bounce">
          <Lock className="h-8 w-8" />
        </div>

        <h2 className="text-base font-extrabold text-slate-900 mb-2">
          Otentikasi Operator SAMBAT
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Masukkan kunci akses operator untuk memverifikasi aduan masuk,
          melakukan triage, dan mengelola disposisi dinas.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-2 uppercase tracking-wider text-left">
              Kunci Akses Operator
            </label>
            <input
              type="password"
              value={operatorKeyInput}
              onChange={(e) => setOperatorKeyInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-center font-mono tracking-widest"
              placeholder="••••••••••••••"
              required
            />
          </div>

          {loginError && (
            <p className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-100 rounded-lg p-2.5">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-sm shadow-teal-700/20 cursor-pointer"
          >
            Masuk Ke Sistem
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-4 w-full">
          <span className="text-[9px] text-slate-400 font-medium">
            Kunci Demo Lomba:{" "}
            <code className="font-mono bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-600">
              {KEYS.operator}
            </code>
          </span>
        </div>
      </div>
    </div>
  );
}
