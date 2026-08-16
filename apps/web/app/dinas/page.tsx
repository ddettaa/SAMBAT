"use client";

import { useRouter } from "next/navigation";
import { useSambatData } from "@/hooks/useSambatData";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import { clearSession } from "@/lib/session";
import SubPageHeader from "../components/SubPageHeader";
import DinasPortal from "../components/dinas/DinasPortal";

export default function DinasPage() {
  const router = useRouter();
  const session = useSessionGuard("dinas");
  const { reports, dinasList, refresh } = useSambatData(10000);

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  // Menunggu pengecekan sesi (localStorage hanya ada di client)
  if (!session) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-slate-50">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-slate-50 text-slate-800 font-sans antialiased">
      <SubPageHeader
        title="Tugas Dinas"
        sessionLabel={session.label}
        onLogout={handleLogout}
      />
      <main className="flex-1 p-8">
        <DinasPortal
          reports={reports}
          dinasList={dinasList}
          dinasId={session.dinasId!}
          onDataChanged={refresh}
        />
      </main>
    </div>
  );
}
