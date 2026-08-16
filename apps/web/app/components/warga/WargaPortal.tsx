"use client";

import { useTicketTracking } from "@/hooks/useTicketTracking";
import type { Report } from "@/lib/types";
import SocialFeed from "./SocialFeed";
import TicketTracker from "./TicketTracker";

interface WargaPortalProps {
  reports: Report[];
  onDataChanged: () => void;
}

// TAB: Portal Warga — social feed + pelacakan tiket
export default function WargaPortal({ reports, onDataChanged }: WargaPortalProps) {
  const tracking = useTicketTracking(onDataChanged);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
      <SocialFeed reports={reports} onSelectReport={tracking.selectFromFeed} />
      <TicketTracker
        trackId={tracking.trackId}
        onTrackIdChange={tracking.setTrackId}
        trackedReport={tracking.trackedReport}
        trackedTimeline={tracking.trackedTimeline}
        trackingError={tracking.trackingError}
        confirmToken={tracking.confirmToken}
        onConfirmTokenChange={tracking.setConfirmToken}
        onTrack={tracking.track}
        onConfirmCompletion={tracking.confirmCompletion}
      />
    </div>
  );
}
