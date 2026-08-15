"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCases, fetchDinas, fetchReports } from "@/lib/api";
import type { Case, Dinas, Report } from "@/lib/types";

// Mengambil data inti (reports, cases, dinas) dan me-refresh berkala (polling)
export function useSambatData(pollMs = 10000) {
  const [reports, setReports] = useState<Report[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [dinasList, setDinasList] = useState<Dinas[]>([]);

  const refresh = useCallback(async () => {
    const [r, c, d] = await Promise.all([
      fetchReports(),
      fetchCases(),
      fetchDinas(),
    ]);
    if (r) setReports(r);
    if (c) setCases(c);
    if (d) setDinasList(d);
  }, []);

  useEffect(() => {
    // Initial load dijadwalkan sebagai task agar setState tidak terjadi
    // secara sinkron di dalam effect (aturan react-hooks/set-state-in-effect)
    const timeoutId = setTimeout(refresh, 0);
    const intervalId = setInterval(refresh, pollMs);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [refresh, pollMs]);

  return { reports, cases, dinasList, refresh };
}
