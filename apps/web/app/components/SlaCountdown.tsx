"use client";

import { Clock } from "lucide-react";
import { useNow } from "@/hooks/useNow";

interface SlaCountdownProps {
  slaDue?: string;
}

// Badge countdown SLA yang berdetak live (overdue / urgent / normal)
export default function SlaCountdown({ slaDue }: SlaCountdownProps) {
  const currentTime = useNow(1000);

  if (!slaDue) return null;

  const due = new Date(slaDue).getTime();
  const diff = due - currentTime;
  const isOverdue = diff < 0;
  const absDiff = Math.abs(diff);

  const hours = Math.floor(absDiff / (3600 * 1000));
  const mins = Math.floor((absDiff % (3600 * 1000)) / (60 * 1000));
  const secs = Math.floor((absDiff % (60 * 1000)) / 1000);

  const pad = (n: number) => String(n).padStart(2, "0");
  const countdownStr = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;

  if (isOverdue) {
    return (
      <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
        <Clock className="h-3 w-3" /> Waktu Terlewati ({countdownStr})
      </span>
    );
  }

  const isUrgent = diff < 2 * 3600 * 1000; // Kurang dari 2 jam

  return (
    <span
      className={`text-[10px] px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${
        isUrgent
          ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
          : "bg-teal-50 text-teal-700 border-teal-200"
      }`}
    >
      <Clock className="h-3 w-3" /> Target Waktu: {countdownStr}
    </span>
  );
}
