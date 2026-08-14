"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  AlertTriangle, CheckCircle, Clock, Compass, FileText, MapPin, 
  Info, RefreshCw, Settings, ShieldAlert, Send, Trash2, User, 
  Image as ImageIcon, ChevronRight, Plus, Search, Building, Check, Globe
} from "lucide-react";

const API_URL = "http://localhost:3001";
const KEYS = {
  collector: "test-collector-key",
  operator: "test-operator-key",
  dinas: "test-dinas-key",
};

// Dynamically load MapComponent to disable SSR
const MapComponent = dynamic(() => import("./components/MapComponent"), { ssr: false });

interface Report {
  id: string;
  source: string;
  source_ref?: string;
  text_original: string;
  text_normalized?: string;
  category: string;
  location_text?: string;
  latitude?: number | null;
  longitude?: number | null;
  confidence?: number | null;
  priority: number;
  priority_detail?: any;
  status: string;
  reporter_pseudo?: string;
  dinas_id?: string;
  sla_due?: string;
  image_before?: string;
  image_after?: string;
  created_at: string;
}

interface Case {
  id: string;
  title: string;
  report_ids: string[] | string;
  report_count: number;
  score: number;
  category: string;
  status: string;
  centroid?: any;
  created_at: string;
}

interface Dinas {
  id: string;
  name: string;
  short: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  detail?: any;
  created_at: string;
}

// Preset photo options for citizens
const PRESET_PHOTOS = [
  { label: "Selokan Mampet", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=400" },
  { label: "Jalan Rusak", url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=400" },
  { label: "Tumpukan Sampah", url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=400" },
  { label: "PJU Mati", url: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=400" }
];

// Preset locations in Banjarmasin
const PRESET_LOCATIONS = [
  { label: "Basirih - Jl. S. Parman", lat: -3.342, lng: 114.583, text: "Jalan S. Parman, Kel. Basirih, Kec. Banjarmasin Barat" },
  { label: "Belitung Selatan - Jl. Hasan Basri", lat: -3.315, lng: 114.578, text: "Jalan Hasan Basri, Kel. Belitung Selatan, Kec. Banjarmasin Barat" },
  { label: "Mantuil - Jl. Mantuil Raya", lat: -3.355, lng: 114.602, text: "Jalan Mantuil Raya, Kel. Mantuil, Kec. Banjarmasin Selatan" },
  { label: "Pramuka - Jl. Pramuka", lat: -3.328, lng: 114.615, text: "Jalan Pramuka, Kel. Pemurus Luar, Kec. Banjarmasin Timur" }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("warga");
  const [reports, setReports] = useState<Report[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [dinasList, setDinasList] = useState<Dinas[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedDinas, setSelectedDinas] = useState<string>("d-pupr");
  
  // Warga Form State
  const [wargaText, setWargaText] = useState("");
  const [wargaLocation, setWargaLocation] = useState(PRESET_LOCATIONS[0]);
  const [wargaPhoto, setWargaPhoto] = useState(PRESET_PHOTOS[0].url);
  const [wargaPseudo, setWargaPseudo] = useState("Warga Banjarmasin");
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; token: string } | null>(null);
  
  // Warga Tracking State
  const [trackId, setTrackId] = useState("");
  const [trackedReport, setTrackedReport] = useState<Report | null>(null);
  const [trackedTimeline, setTrackedTimeline] = useState<any[]>([]);
  const [trackingError, setTrackingError] = useState("");
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmAttempts, setConfirmAttempts] = useState(0);
  const [confirmToken, setConfirmToken] = useState("");

  // Operator Edit Triage State
  const [reviewReport, setReviewReport] = useState<Report | null>(null);
  const [editCategory, setEditCategory] = useState("lainnya");
  const [editDinas, setEditDinas] = useState("d-pupr");
  const [operatorMsg, setOperatorMsg] = useState("");

  // Loading States
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);

  // Fetch Core Data
  const fetchData = async () => {
    try {
      // 1. Fetch Reports
      const resReports = await fetch(`${API_URL}/api/reports`, {
        headers: { "x-api-key": KEYS.operator }
      });
      if (resReports.ok) setReports(await resReports.json());

      // 2. Fetch Cases
      const resCases = await fetch(`${API_URL}/api/cases`, {
        headers: { "x-api-key": KEYS.operator }
      });
      if (resCases.ok) setCases(await resCases.json());

      // 3. Fetch Dinas
      const resDinas = await fetch(`${API_URL}/api/dinas`);
      if (resDinas.ok) setDinasList(await resDinas.json());

      // 4. Fetch Audit Logs
      const resAudit = await fetch(`${API_URL}/api/audit`, {
        headers: { "x-api-key": KEYS.operator }
      });
      if (resAudit.ok) setAuditLogs(await resAudit.json());
    } catch (e) {
      console.error("Failed to fetch data:", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Citizen Submit Report
  const handleWargaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wargaText.trim()) return;
    setLoading(true);
    setSubmittedTicket(null);
    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEYS.collector },
        body: JSON.stringify({
          text: wargaText,
          source: "web",
          latitude: wargaLocation.lat,
          longitude: wargaLocation.lng,
          locationText: wargaLocation.text,
          reporterPseudo: wargaPseudo,
          imageBefore: wargaPhoto
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSubmittedTicket({ id: data.id, token: data.confirmationToken });
        setWargaText("");
        fetchData();
      } else {
        alert("Gagal mengirim laporan: " + data.error);
      }
    } catch (err) {
      alert("Error menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  // Track Ticket
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    setLoading(true);
    setTrackingError("");
    setTrackedReport(null);
    setConfirmSuccess(false);
    try {
      const res = await fetch(`${API_URL}/api/reports/${trackId.trim()}`, {
        headers: { "x-api-key": KEYS.operator }
      });
      const data = await res.json();
      if (res.ok) {
        setTrackedReport(data);
        setTrackedTimeline(data.timeline || []);
      } else {
        setTrackingError("Laporan tidak ditemukan. Pastikan ID Tiket Anda benar.");
      }
    } catch (err) {
      setTrackingError("Koneksi gagal.");
    } finally {
      setLoading(false);
    }
  };

  // Citizen Confirmation (Close Case)
  const handleConfirmCompletion = async (token: string) => {
    if (!trackedReport) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/${trackedReport.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (res.ok) {
        setConfirmSuccess(true);
        // Refresh tracking view
        const resUpdate = await fetch(`${API_URL}/api/reports/${trackedReport.id}`, {
          headers: { "x-api-key": KEYS.operator }
        });
        if (resUpdate.ok) {
          const updated = await resUpdate.json();
          setTrackedReport(updated);
          setTrackedTimeline(updated.timeline || []);
        }
        fetchData();
      } else {
        alert("Konfirmasi gagal: " + data.error);
      }
    } catch (err) {
      alert("Koneksi gagal.");
    } finally {
      setLoading(false);
    }
  };

  // Operator Action (Routing or Updating status)
  const handleOperatorTriage = async () => {
    if (!reviewReport) return;
    setLoading(true);
    setOperatorMsg("");
    try {
      // 1. Edit Category if changed
      if (reviewReport.category !== editCategory) {
        // Just mock edit by calling status / simulate update if needed
      }

      // 2. Route to Dinas
      const resRoute = await fetch(`${API_URL}/api/reports/${reviewReport.id}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEYS.operator },
        body: JSON.stringify({ dinasId: editDinas })
      });
      const routeData = await resRoute.json();
      if (resRoute.ok) {
        setOperatorMsg("Laporan berhasil diverifikasi dan diteruskan ke " + editDinas.toUpperCase());
        setReviewReport(null);
        fetchData();
      } else {
        setOperatorMsg("Gagal melakukan routing: " + routeData.error);
      }
    } catch (e) {
      setOperatorMsg("Error triage.");
    } finally {
      setLoading(false);
    }
  };

  // Dinas Actions
  const handleDinasAction = async (reportId: string, action: "dikerjakan" | "selesai") => {
    setLoading(true);
    try {
      const nextStatus = action === "dikerjakan" ? "dikerjakan" : "menunggu_konfirmasi";
      
      // If resolving, attach a simulated After photo
      let imageAfter = undefined;
      if (action === "selesai") {
        const report = reports.find(r => r.id === reportId);
        if (report?.category === "sampah") imageAfter = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=400";
        else if (report?.category === "jalan") imageAfter = "https://images.unsplash.com/photo-1533563906091-fdfdffc3e3c4?q=80&w=400";
        else if (report?.category === "lampu") imageAfter = "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=400";
        else imageAfter = "https://images.unsplash.com/photo-1595841696660-1d965503a552?q=80&w=400";
      }

      const res = await fetch(`${API_URL}/api/reports/${reportId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEYS.dinas },
        body: JSON.stringify({ status: nextStatus, note: `Dikerjakan oleh dinas ${selectedDinas.toUpperCase()}`, imageAfter })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert("Gagal memperbarui status: " + err.error);
      }
    } catch (err) {
      alert("Error.");
    } finally {
      setLoading(false);
    }
  };

  // Demo Control Panel Actions
  const handleDemoReset = async () => {
    setSimulating("reset");
    try {
      const res = await fetch(`${API_URL}/api/demo/reset`, { 
        method: "POST",
        headers: { "x-api-key": KEYS.operator }
      });
      if (res.ok) {
        alert("Database berhasil di-reset dan di-seeder awal!");
        fetchData();
        setSubmittedTicket(null);
        setTrackedReport(null);
      }
    } catch (e) {
      alert("Gagal reset database.");
    } finally {
      setSimulating(null);
    }
  };

  const handleDemoSimulate = async (scenario: string) => {
    setSimulating(scenario);
    try {
      const res = await fetch(`${API_URL}/api/demo/simulate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": KEYS.operator 
        },
        body: JSON.stringify({ scenario })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Skenario [${scenario.toUpperCase()}] berhasil disimulasikan! Silakan cek dasbor.`);
        fetchData();
      } else {
        alert("Gagal simulasi: " + data.error);
      }
    } catch (e) {
      alert("Error simulasi.");
    } finally {
      setSimulating(null);
    }
  };

  // Helper status color classes
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "terdeteksi": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "terverifikasi": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "diteruskan": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "dikerjakan": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "menunggu_konfirmasi": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "selesai": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      
      {/* ─── LEFT PANEL (75% Width) ─── */}
      <div className="flex flex-1 flex-col h-full overflow-hidden border-r border-zinc-800">
        
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Compass className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                SAMBAT <span className="text-xs font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">Ideathon 2026</span>
              </h1>
              <p className="text-xs text-zinc-400">Sistem Agen Masyarakat Banjarmasin Tanggap</p>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <nav className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {["warga", "operator", "dinas", "transparansi"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium rounded-lg capitalize transition-all ${
                  activeTab === tab 
                    ? "bg-zinc-800 text-emerald-400 shadow-lg border border-zinc-700" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab === "warga" ? "📢 Warga" : tab === "operator" ? "🛡️ Operator" : tab === "dinas" ? "🏢 Dinas" : "📊 Transparansi"}
              </button>
            ))}
          </nav>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-8 bg-zinc-950/40">
          
          {/* TAB 1: WARGA PORTAL */}
          {activeTab === "warga" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              
              {/* Form Lapor */}
              <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
                    <Send className="h-4 w-4 text-emerald-400" />
                    Buat Laporan Baru
                  </h2>
                  <p className="text-xs text-zinc-400 mb-6">Laporan akan diproses otomatis oleh AI normalizer Bahasa Banjar.</p>
                  
                  <form onSubmit={handleWargaSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Nama Pelapor (Samaran)</label>
                      <input 
                        type="text" 
                        value={wargaPseudo}
                        onChange={(e) => setWargaPseudo(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                        placeholder="Misal: Warga Basirih"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Apa yang Terjadi?</label>
                      <textarea
                        value={wargaText}
                        onChange={(e) => setWargaText(e.target.value)}
                        rows={4}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 resize-none"
                        placeholder="Tulis keluhan Anda... (Bisa Bahasa Banjar: 'Parit di muka rumah ulun mampet banar...')"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">Pilih Geolocation</label>
                        <select
                          value={wargaLocation.label}
                          onChange={(e) => {
                            const found = PRESET_LOCATIONS.find(loc => loc.label === e.target.value);
                            if (found) setWargaLocation(found);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        >
                          {PRESET_LOCATIONS.map(loc => (
                            <option key={loc.label} value={loc.label}>{loc.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">Pilih Foto Bukti</label>
                        <select
                          value={wargaPhoto}
                          onChange={(e) => setWargaPhoto(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        >
                          {PRESET_PHOTOS.map(photo => (
                            <option key={photo.label} value={photo.url}>{photo.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !wargaText}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm mt-4 shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Kirim Laporan
                    </button>
                  </form>
                </div>

                {submittedTicket && (
                  <div className="mt-6 border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <CheckCircle className="h-4 w-4" />
                      Laporan Terkirim!
                    </div>
                    <p className="text-zinc-400 text-xs">Simpan tiket tracking ini untuk melihat progres laporan Anda:</p>
                    <div className="bg-zinc-950 rounded border border-zinc-800 px-3 py-2 flex items-center justify-between mt-1">
                      <code className="text-xs text-white font-mono">{submittedTicket.id}</code>
                      <button 
                        onClick={() => {
                          setTrackId(submittedTicket.id);
                          setSubmittedTicket(null);
                        }}
                        className="text-emerald-400 hover:underline text-xs flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        Lacak Progres <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      *Token Konfirmasi: <code className="font-mono bg-zinc-950 px-1 py-0.5 rounded">{submittedTicket.token}</code> (Gunakan untuk menutup kasus nanti)
                    </div>
                  </div>
                )}
              </div>

              {/* Lacak Tiket */}
              <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 flex flex-col">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-emerald-400" />
                  Lacak & Konfirmasi Progres
                </h2>
                <p className="text-xs text-zinc-400 mb-6">Pantau status penanganan dan konfirmasi jika masalah sudah selesai diperbaiki.</p>

                <form onSubmit={handleTrack} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                    placeholder="Masukkan ID Tiket (rpt_...)"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700 font-mono"
                    required
                  />
                  <button 
                    type="submit"
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    Lacak
                  </button>
                </form>

                {trackingError && (
                  <p className="text-red-400 text-xs bg-red-500/5 border border-red-500/10 rounded-xl p-3 mb-4">{trackingError}</p>
                )}

                {trackedReport && (
                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Ticket Summary */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs text-zinc-400">ID Tiket: <span className="font-mono text-white text-xs">{trackedReport.id}</span></div>
                          <h3 className="text-sm font-bold text-white mt-1 capitalize">{trackedReport.category}</h3>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase border rounded-full ${getStatusBadgeClass(trackedReport.status)}`}>
                          {trackedReport.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Before / After Images display */}
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <span className="block text-[10px] text-zinc-500 mb-1">Bukti Laporan (Warga):</span>
                          {trackedReport.image_before ? (
                            <img src={trackedReport.image_before} className="w-full h-24 object-cover rounded-lg border border-zinc-800" alt="Bukti Sebelum" />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-500">Tidak ada foto</div>
                          )}
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500 mb-1">Bukti Perbaikan (Dinas):</span>
                          {trackedReport.image_after ? (
                            <img src={trackedReport.image_after} className="w-full h-24 object-cover rounded-lg border border-zinc-800" alt="Bukti Sesudah" />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-500">Belum diperbaiki</div>
                          )}
                        </div>
                      </div>

                      {/* Normalization & Transparent Priority details */}
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                        <div>
                          <span className="block text-[10px] text-zinc-500">Isi Pengaduan Asli:</span>
                          <p className="text-xs text-zinc-300 italic mt-0.5">"{trackedReport.text_original}"</p>
                        </div>
                        {trackedReport.text_normalized && trackedReport.text_normalized !== trackedReport.text_original && (
                          <div>
                            <span className="block text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                              <Check className="h-3 w-3" /> Dipahami SAMBAT AI sebagai:
                            </span>
                            <p className="text-xs text-zinc-200 mt-0.5">"{trackedReport.text_normalized}"</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-zinc-800 pt-2 text-[10px]">
                          <span className="text-zinc-500">Skor Prioritas Transparan:</span>
                          <span className="font-bold text-red-400 text-xs">{trackedReport.priority} / 100</span>
                        </div>
                      </div>

                      {/* Timeline status */}
                      <div className="space-y-2">
                        <span className="block text-[10px] text-zinc-500">Riwayat Timeline:</span>
                        <div className="space-y-1.5 pl-2 border-l border-zinc-800">
                          {trackedTimeline.map((evt, idx) => (
                            <div key={idx} className="relative pl-3 text-xs">
                              <span className="absolute -left-[14px] top-1.5 w-2 height-2 rounded-full bg-zinc-700"></span>
                              <span className="text-zinc-400 capitalize">{evt.status.replace("_", " ")}</span>
                              {evt.note && <span className="text-zinc-500 font-mono text-[10px] block">{evt.note}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Citizen confirmation box */}
                    {trackedReport.status === "menunggu_konfirmasi" && (
                      <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4 mt-6">
                        <h4 className="text-xs font-bold text-yellow-400 mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" /> Konfirmasi Penyelesaian
                        </h4>
                        <p className="text-[11px] text-zinc-400 mb-3">Dinas menyatakan pekerjaan telah selesai. Masukkan token konfirmasi dari pengaduan untuk menutup tiket:</p>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={confirmToken}
                            onChange={(e) => setConfirmToken(e.target.value)}
                            placeholder="Token Konfirmasi"
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none flex-1"
                          />
                          <button
                            onClick={() => handleConfirmCompletion(confirmToken)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            Konfirmasi Selesai
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: OPERATOR DASHBOARD */}
          {activeTab === "operator" && (
            <div className="space-y-8 max-w-6xl mx-auto">
              
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Laporan", val: reports.length, icon: FileText, color: "text-zinc-400" },
                  { label: "Butuh Review", val: reports.filter(r => typeof r.confidence === "number" && r.confidence < 0.8 && r.status === "terdeteksi").length, icon: AlertTriangle, color: "text-red-400" },
                  { label: "Kasus Aktif", val: cases.length, icon: Building, color: "text-indigo-400" },
                  { label: "Selesai", val: reports.filter(r => r.status === "selesai").length, icon: CheckCircle, color: "text-emerald-400" }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">{stat.label}</span>
                      <span className="text-xl font-bold text-white mt-1 block">{stat.val}</span>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color} opacity-20`} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Triage / Review Queue */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    Triage & Verifikasi AI (Antrean Operator)
                  </h3>

                  <div className="space-y-3 overflow-y-auto max-h-[450px] pr-2">
                    {reports
                      .filter(r => r.status === "terdeteksi")
                      .map((report) => (
                        <div 
                          key={report.id}
                          className={`p-4 rounded-xl border border-zinc-800 cursor-pointer transition-all hover:bg-zinc-800/40 ${
                            reviewReport?.id === report.id ? "bg-zinc-800/80 border-emerald-500/30" : "bg-zinc-900/30"
                          }`}
                          onClick={() => {
                            setReviewReport(report);
                            setEditCategory(report.category);
                            // Set default dinas based on category
                            const dinasMap: Record<string, string> = { sampah: "d-dlh", drainase: "d-pupr", jalan: "d-pupr", lampu: "d-dishub" };
                            setEditDinas(dinasMap[report.category] || "d-pupr");
                            setOperatorMsg("");
                          }}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-2">
                            <span className="font-mono text-zinc-400">{report.id}</span>
                            <span className="text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded">
                              Confidence: {typeof report.confidence === "number" ? Math.round(report.confidence * 100) : 0}%
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 italic mb-2">"{report.text_original}"</p>
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-2">
                            <span className="capitalize">Kategori: <strong className="text-zinc-300">{report.category}</strong></span>
                            <span>Prioritas: <strong className="text-red-400">{report.priority}</strong></span>
                          </div>
                        </div>
                      ))}

                    {reports.filter(r => r.status === "terdeteksi").length === 0 && (
                      <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                        <CheckCircle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500">Antrean triage kosong. Semua laporan sudah terverifikasi.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Panel */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-4">Verifikasi & Triage Laporan</h3>
                  
                  {reviewReport ? (
                    <div className="space-y-4">
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-500">Isi Pengaduan:</span>
                        <p className="text-xs text-zinc-300 mt-1 italic">"{reviewReport.text_original}"</p>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Klasifikasi Kategori</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        >
                          {["sampah", "drainase", "jalan", "lampu", "lainnya"].map(cat => (
                            <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Dinas Penerima</label>
                        <select
                          value={editDinas}
                          onChange={(e) => setEditDinas(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        >
                          {dinasList.map(d => (
                            <option key={d.id} value={d.id}>{d.short} — {d.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleOperatorTriage}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer mt-4"
                      >
                        <Check className="h-4 w-4" />
                        Verifikasi & Teruskan ke Dinas
                      </button>

                      {operatorMsg && (
                        <p className="text-[11px] text-yellow-400 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2.5 mt-2">{operatorMsg}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-xs text-zinc-500">
                      Pilih salah satu laporan di antrean sebelah kiri untuk melakukan review AI manual.
                    </div>
                  )}
                </div>
              </div>

              {/* Cases List */}
              <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Kasus Kolektif Hasil Penggabungan (Duplicate Merged)</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500">
                        <th className="pb-3 font-semibold">Kasus ID</th>
                        <th className="pb-3 font-semibold">Kategori</th>
                        <th className="pb-3 font-semibold">Kasus Title / Jumlah Laporan</th>
                        <th className="pb-3 font-semibold text-center">Priority Score</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Tgl Dibuat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {cases.map((c) => (
                        <tr key={c.id} className="text-zinc-300">
                          <td className="py-3 font-mono text-zinc-400">{c.id}</td>
                          <td className="py-3 capitalize">{c.category}</td>
                          <td className="py-3">
                            <span className="font-semibold text-white">{c.title}</span>
                            <span className="text-[10px] block text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-max mt-1">
                              {c.report_count} laporan digabungkan
                            </span>
                          </td>
                          <td className="py-3 text-center text-red-400 font-bold">{c.score} / 100</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-full ${getStatusBadgeClass(c.status)}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 text-zinc-500">{new Date(c.created_at).toLocaleString("id-ID")}</td>
                        </tr>
                      ))}

                      {cases.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-zinc-500">Belum ada kasus kolektif. Jalankan skenario duplikasi di sidebar untuk melihat penggabungan laporan serupa!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DINAS PORTAL */}
          {activeTab === "dinas" && (
            <div className="space-y-8 max-w-6xl mx-auto">
              
              {/* Dinas Selection */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400">Pilih Ruang Lingkup Dinas</h3>
                  <p className="text-xs text-zinc-500">Menampilkan pengaduan yang diteruskan sesuai kewenangan dinas terkait.</p>
                </div>
                
                <div className="flex gap-2">
                  {dinasList.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDinas(d.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        selectedDinas === d.id 
                          ? "bg-emerald-500 text-zinc-950 font-bold shadow-lg" 
                          : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task list for Dinas */}
              <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
                  <Building className="h-4 w-4 text-emerald-400" />
                  Antrean Tugas Dinas — {selectedDinas.toUpperCase()}
                </h3>

                <div className="space-y-4">
                  {reports
                    .filter(r => r.dinas_id === selectedDinas && ["diteruskan", "dikerjakan"].includes(r.status))
                    .map((report) => {
                      const isOverdue = report.sla_due && new Date(report.sla_due) < new Date();
                      
                      return (
                        <div key={report.id} className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                          
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-zinc-400 text-xs">{report.id}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-full ${getStatusBadgeClass(report.status)}`}>
                                {report.status}
                              </span>
                              
                              {/* SLA Timer Indicator */}
                              {report.sla_due && (
                                <span className={`text-[10px] flex items-center gap-1 font-semibold ${isOverdue ? "text-red-400" : "text-yellow-400"}`}>
                                  <Clock className="h-3 w-3" />
                                  {isOverdue 
                                    ? "SLA Terlewat (Overdue)" 
                                    : `SLA: Jatuh tempo pada ${new Date(report.sla_due).toLocaleString("id-ID")}`
                                  }
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-zinc-200 font-medium">"{report.text_normalized || report.text_original}"</p>
                            <div className="text-[10px] text-zinc-500">
                              Alamat/Lokasi: <span className="text-zinc-300">{report.location_text || "Banjarmasin"}</span>
                            </div>
                            
                            {/* Photo Before */}
                            {report.image_before && (
                              <div className="mt-2">
                                <span className="block text-[9px] text-zinc-500 mb-0.5">Bukti Foto Sebelum Perbaikan:</span>
                                <img src={report.image_before} className="w-32 h-20 object-cover rounded-lg border border-zinc-800" alt="Sebelum" />
                              </div>
                            )}
                          </div>

                          {/* Dinas Actions */}
                          <div className="flex md:flex-col gap-2 min-w-[150px]">
                            {report.status === "diteruskan" && (
                              <button
                                onClick={() => handleDinasAction(report.id, "dikerjakan")}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer"
                              >
                                Kerjakan Tugas
                              </button>
                            )}
                            {report.status === "dikerjakan" && (
                              <button
                                onClick={() => handleDinasAction(report.id, "selesai")}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer"
                              >
                                Selesaikan (Upload After)
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {reports.filter(r => r.dinas_id === selectedDinas && ["diteruskan", "dikerjakan"].includes(r.status)).length === 0 && (
                    <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
                      <CheckCircle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">Tidak ada tugas aktif untuk dinas ini.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PUBLIC TRANSPARENCY PORTAL */}
          {activeTab === "transparansi" && (
            <div className="space-y-8 max-w-6xl mx-auto h-full flex flex-col">
              
              {/* Aggregated KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Pengaduan Kota", val: reports.length, desc: "Seluruh keluhan tercatat" },
                  { label: "Dalam Progres", val: reports.filter(r => ["diteruskan", "dikerjakan"].includes(r.status)).length, desc: "Sedang dikerjakan dinas" },
                  { label: "Selesai Penanganan", val: reports.filter(r => r.status === "selesai").length, desc: "Tuntas dikonfirmasi warga" },
                  { label: "SLA Compliance", val: reports.length > 0 ? `${Math.round((reports.filter(r => r.status === "selesai" || (r.sla_due && new Date(r.sla_due) > new Date())).length / reports.length) * 100)}%` : "0%", desc: "Respons sesuai target SLA" }
                ].map((metric, idx) => (
                  <div key={idx} className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-4">
                    <span className="text-[10px] text-zinc-500 block">{metric.label}</span>
                    <span className="text-xl font-bold text-white mt-1 block">{metric.val}</span>
                    <span className="text-[9px] text-zinc-400 mt-1 block">{metric.desc}</span>
                  </div>
                ))}
              </div>

              {/* Leaflet aggregate Map */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[450px]">
                
                {/* Map Panel */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 lg:col-span-2 h-[450px]">
                  <h3 className="text-xs font-semibold text-zinc-400 mb-3">Peta Sebaran Laporan Warga Kota Banjarmasin</h3>
                  <MapComponent reports={reports} />
                </div>

                {/* Transparency scoring explainability panel */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-emerald-400" />
                      Prioritas Transparan (SMART)
                    </h3>
                    <p className="text-xs text-zinc-400 mb-4">
                      SAMBAT menggunakan sistem pengambilan keputusan transparan **SMART (Simple Multi-Attribute Rating Technique)** berbasis penelitian. Kami menghitung skor prioritas warga (0–100) menggunakan formula publik:
                    </p>

                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-[10px] text-zinc-400 space-y-2 mb-4">
                      <div className="font-bold text-white text-xs border-b border-zinc-800 pb-1 mb-2">P = 30U + 25D + 20V + 15T + 10R</div>
                      <div>• **U** (30%): Urgensi / risiko keselamatan</div>
                      <div>• **D** (25%): Jumlah laporan serupa (Dampak)</div>
                      <div>• **V** (20%): Validitas bukti foto & lokasi</div>
                      <div>• **T** (15%): Lama waktu tunggu kasus</div>
                      <div>• **R** (10%): Radius wilayah terdampak banjir</div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4 text-[10px] text-zinc-500">
                    *Mekanisme ini memastikan tidak ada "laporan VIP" atau pilih kasih birokrasi. Sistem memprioritaskan apa yang paling mendesak bagi warga kota secara adil dan transparan.
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ─── RIGHT PANEL: DEMO CONTROL CENTER (25% Width) ─── */}
      <aside className="w-80 bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
            <Settings className="h-5 w-5 text-emerald-400 animate-spin-slow" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Demo Control Center</h2>
              <p className="text-[10px] text-zinc-400">Simulasikan Storyline Lifecycle SAMBAT</p>
            </div>
          </div>

          {/* Action Simulation Buttons */}
          <div className="space-y-3">
            
            {/* RESET DATABASE */}
            <button
              onClick={handleDemoReset}
              disabled={simulating !== null}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {simulating === "reset" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear & Reset Database
            </button>

            <div className="border-t border-zinc-800 my-4 pt-4">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Simulasi Skenario Lomba</span>
              
              <div className="space-y-2">
                {/* SCENARIO 1: BANJAR LANGUAGE */}
                <button
                  onClick={() => handleDemoSimulate("banjar")}
                  disabled={simulating !== null}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 px-3 rounded-lg text-left transition-all border border-zinc-700 flex items-center justify-between cursor-pointer disabled:opacity-50"
                >
                  <span className="font-semibold text-white">1. Warga Melapor (Banjar)</span>
                  <ChevronRight className="h-3 w-3" />
                </button>

                {/* SCENARIO 2: DUPLICATE MERGING */}
                <button
                  onClick={() => handleDemoSimulate("duplicate")}
                  disabled={simulating !== null}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 px-3 rounded-lg text-left transition-all border border-zinc-700 flex items-center justify-between cursor-pointer disabled:opacity-50"
                >
                  <span className="font-semibold text-white">2. Duplikasi Kasus (Auto-Merge)</span>
                  <ChevronRight className="h-3 w-3" />
                </button>

                {/* SCENARIO 3: LOW CONFIDENCE REVIEW */}
                <button
                  onClick={() => handleDemoSimulate("low_confidence")}
                  disabled={simulating !== null}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 px-3 rounded-lg text-left transition-all border border-zinc-700 flex items-center justify-between cursor-pointer disabled:opacity-50"
                >
                  <span className="font-semibold text-white">3. Review Operator Queue</span>
                  <ChevronRight className="h-3 w-3" />
                </button>

                {/* SCENARIO 4: OVERDUE SLA ESCALATION */}
                <button
                  onClick={() => handleDemoSimulate("sla_escalated")}
                  disabled={simulating !== null}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 px-3 rounded-lg text-left transition-all border border-zinc-700 flex items-center justify-between cursor-pointer disabled:opacity-50"
                >
                  <span className="font-semibold text-white">4. Kasus Overdue SLA</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Explanation box */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-[10px] text-zinc-400 space-y-3 mt-4">
              <h4 className="text-zinc-200 font-bold flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-emerald-400" />
                Mengapa Demo Mode ini?
              </h4>
              <p>
                Skenario di atas menyimulasikan aliran data nyata tanpa bergantung pada API eksternal (Playwright medsos/WA).
              </p>
              <p>
                Cukup klik skenario, lalu tukar tab di atas untuk melihat bagaimana AI mendeteksi kemiripan bahasa Banjar, operator mengevaluasi kategori, dan dinas mengunggah bukti penyelesaian.
              </p>
            </div>

          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4 text-[10px] text-zinc-500 text-center flex flex-col gap-1">
          <div>SAMBAT — Smart Governance MVP</div>
          <div>Banjarmasin Smart City Ideathon 2026</div>
        </div>
      </aside>

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 10s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
