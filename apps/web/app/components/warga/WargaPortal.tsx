"use client";

import { useTicketTracking } from "@/hooks/useTicketTracking";
import type { Report } from "@/lib/types";
import SocialFeed from "./SocialFeed";
import TicketTracker from "./TicketTracker";

interface WargaPortalProps {
  reports: Report[];
}

// TAB: Portal Warga — tata letak editorial dua kolom tanpa card.
// Kiri: aliran aduan live (divide-y rows). Kanan: pelacakan tiket.
export default function WargaPortal({ reports }: WargaPortalProps) {
  const tracking = useTicketTracking();

  return (
    <div className="bg-white">
      {/* Hero strip — trust-first, rata kiri, satu eyebrow untuk seluruh halaman */}
      <section className="border-b border-slate-200">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pt-10 sm:pt-16 pb-8 sm:pb-12">
          <p className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700">
            Portal Warga — Kota Banjarmasin
          </p>
          <h1 className="mt-3 sm:mt-4 max-w-3xl text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter leading-[1.05] text-slate-900">
            Sampaikan keluhanmu, kami kawal sampai selesai.
          </h1>
          <p className="mt-3 sm:mt-5 max-w-[65ch] text-sm sm:text-base leading-relaxed text-slate-600">
            Aduan warga dari media sosial dan web dikumpulkan AI, diprioritaskan
            secara transparan, lalu ditindaklanjuti dinas terkait.
          </p>
        </div>
      </section>

      {/* Split content — dipisah garis vertikal 1px, bukan card */}
      <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
          <SocialFeed
            reports={reports}
            onSelectReport={tracking.selectFromFeed}
          />
          <div className="lg:border-l lg:border-slate-200 lg:pl-10">
            <TicketTracker
              trackId={tracking.trackId}
              onTrackIdChange={tracking.setTrackId}
              trackedReport={tracking.trackedReport}
              trackedTimeline={tracking.trackedTimeline}
              trackingError={tracking.trackingError}
              loading={tracking.loading}
              onTrack={tracking.track}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
