"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, type Session, type SessionRole } from "@/lib/session";

// Guard halaman internal: baca session dari localStorage (hanya ada di
// client), redirect ke /login bila peran tidak cocok. Pembacaan dijadwalkan
// sebagai task agar setState tidak sinkron di dalam effect body
// (aturan react-hooks/set-state-in-effect) dan HTML hasil SSR tetap cocok
// saat hydration (tidak ada hydration mismatch).
export function useSessionGuard(role: SessionRole): Session | null {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      const s = getSession();
      if (!s || s.role !== role || (role === "dinas" && !s.dinasId)) {
        router.replace("/login");
        return;
      }
      setSession(s);
    }, 0);
    return () => clearTimeout(id);
  }, [role, router]);

  return session;
}
