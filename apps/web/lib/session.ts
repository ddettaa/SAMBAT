"use client";

// Session demo berbasis localStorage.
// CATATAN: ini demo-grade (kunci diverifikasi di client). Untuk produksi,
// ganti dengan session server-side / JWT yang divalidasi API.

export type SessionRole = "operator" | "dinas";

export interface Session {
  role: SessionRole;
  dinasId?: string;
  label: string;
}

const STORAGE_KEY = "sambat.session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed.role !== "operator" && parsed.role !== "dinas") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
