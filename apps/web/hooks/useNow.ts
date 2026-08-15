"use client";

import { useEffect, useState } from "react";

// Timestamp "sekarang" yang diperbarui berkala (untuk countdown SLA real-time)
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
