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

// Dynamically load MapComponent & MapPicker to disable SSR
const MapComponent = dynamic(() => import("./components/MapComponent"), { ssr: false });
const MapPicker = dynamic(() => import("./components/MapPicker"), { ssr: false });

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

const LOCAL_GEOCODE_DB = [
  { keys: ["s. parman", "parman", "basirih"], lat: -3.342, lng: 114.583 },
  { keys: ["hasan basri", "belitung", "kayutangi"], lat: -3.315, lng: 114.578 },
  { keys: ["mantuil"], lat: -3.355, lng: 114.602 },
  { keys: ["pramuka", "pemurus"], lat: -3.328, lng: 114.615 },
  { keys: ["veteran"], lat: -3.324, lng: 114.599 },
  { keys: ["lambung mangkurat", "pusat", "balai kota"], lat: -3.320, lng: 114.591 },
  { keys: ["a. yani", "ahmad yani", "km"], lat: -3.327, lng: 114.597 },
  { keys: ["sungai andai", "andai"], lat: -3.295, lng: 114.605 },
  { keys: ["teluk dalam", "sutoyo"], lat: -3.326, lng: 114.580 }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("warga");
  const [reports, setReports] = useState<Report[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [dinasList, setDinasList] = useState<Dinas[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedDinas, setSelectedDinas] = useState<string>("d-pupr");
  
  // Real-time ticking state for SLA countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Warga Form State
  const [wargaText, setWargaText] = useState("");
  const [wargaLocation, setWargaLocation] = useState(PRESET_LOCATIONS[0]);
  const [wargaCoords, setWargaCoords] = useState({ lat: PRESET_LOCATIONS[0].lat, lng: PRESET_LOCATIONS[0].lng });
  const [customAddress, setCustomAddress] = useState(PRESET_LOCATIONS[0].text);
  const [wargaPhoto, setWargaPhoto] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [wargaPseudo, setWargaPseudo] = useState("Warga Banjarmasin");
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; token: string } | null>(null);
  
  // Warga Tracking State
  const [trackId, setTrackId] = useState("");
  const [trackedReport, setTrackedReport] = useState<Report | null>(null);
  const [trackedTimeline, setTrackedTimeline] = useState<any[]>([]);
  const [trackingError, setTrackingError] = useState("");
  const [confirmSuccess, setConfirmSuccess] = useState(false);
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
      const resReports = await fetch(`${API_URL}/api/reports`, {
        headers: { "x-api-key": KEYS.operator }
      });
      if (resReports.ok) setReports(await resReports.json());

      const resCases = await fetch(`${API_URL}/api/cases`, {
        headers: { "x-api-key": KEYS.operator }
      });
      if (resCases.ok) setCases(await resCases.json());

      const resDinas = await fetch(`${API_URL}/api/dinas`);
      if (resDinas.ok) setDinasList(await resDinas.json());

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
    const interval = setInterval(fetchData, 10000);
    
    // Live timer tick
    const clockInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  // Local automatic geocoding based on typed address keywords
  useEffect(() => {
    if (!customAddress) return;
    const text = customAddress.toLowerCase();
    const match = LOCAL_GEOCODE_DB.find(loc => 
      loc.keys.some(k => text.includes(k))
    );
    if (match) {
      setWargaCoords({ lat: match.lat, lng: match.lng });
    }
  }, [customAddress]);

  // Handle citizen file upload & camera snap
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview thumbnail
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    // Read file as Base64 for the API payload
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setWargaPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

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
          latitude: wargaCoords.lat,
          longitude: wargaCoords.lng,
          locationText: customAddress.trim() || `Koordinat: ${wargaCoords.lat.toFixed(5)}, ${wargaCoords.lng.toFixed(5)}`,
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
      case "terdeteksi": return "bg-red-50 text-red-700 border-red-200";
      case "terverifikasi": return "bg-blue-50 text-blue-700 border-blue-200";
      case "diteruskan": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "dikerjakan": return "bg-amber-50 text-amber-700 border-amber-200";
      case "menunggu_konfirmasi": return "bg-orange-50 text-orange-700 border-orange-200";
      case "selesai": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Helper category badge styles
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "sampah": return "bg-purple-50 text-purple-700 border-purple-200";
      case "drainase": return "bg-blue-50 text-blue-700 border-blue-200";
      case "jalan": return "bg-pink-50 text-pink-700 border-pink-200";
      case "lampu": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Render priority color hex code
  const getPriorityColor = (priority: number) => {
    if (priority >= 75) return "#ef4444"; // Red
    if (priority >= 50) return "#f97316"; // Orange
    if (priority >= 25) return "#eab308"; // Yellow
    return "#10b981"; // Green
  };

  // Render ticking live SLA countdown
  const renderSlaCountdown = (slaDueStr?: string) => {
    if (!slaDueStr) return null;
    const due = new Date(slaDueStr).getTime();
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
          <Clock className="h-3 w-3" /> SLA Terlewat ({countdownStr})
        </span>
      );
    }
    
    const isUrgent = diff < 2 * 3600 * 1000; // Less than 2 hours
    
    return (
      <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${
        isUrgent 
          ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse" 
          : "bg-teal-50 text-teal-700 border-teal-200"
      }`}>
        <Clock className="h-3 w-3" /> SLA: {countdownStr}
      </span>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans antialiased">
      
      {/* ─── LEFT PANEL (75% Width) ─── */}
      <div className="flex flex-1 flex-col h-full overflow-hidden border-r border-slate-200">
        
        {/* Header (Teal Accent & Wave Design Decorator) */}
        <header className="flex flex-col border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100 shadow-sm">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                  SAMBAT
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                    Smart Governance
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">Sistem Agen Masyarakat Banjarmasin Tanggap</p>
              </div>
            </div>
            
            {/* Tabs Navigation */}
            <nav className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              {[
                { id: "warga", label: "📢 Portal Warga" },
                { id: "operator", label: "🛡️ Dasbor Operator" },
                { id: "dinas", label: "🏢 Tugas Dinas" },
                { id: "transparansi", label: "📊 Transparansi Publik" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.id 
                      ? "bg-white text-teal-700 shadow-sm border border-slate-200" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          {/* River Waves Line Decoration */}
          <div className="w-full h-1 bg-gradient-to-r from-teal-700 via-sky-500 to-amber-500" />
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          
          {/* TAB 1: WARGA PORTAL */}
          {activeTab === "warga" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              
              {/* Form Lapor */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden bg-sasirangan">
                <div className="absolute inset-0 bg-white/95 z-0" />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Send className="h-4 w-4 text-teal-700" />
                        Aduan Warga Banjarmasin
                      </h2>
                      <span className="text-[10px] text-slate-400 font-mono italic">Kamus Banjar 3.078 Kata</span>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-6">
                      Sampaikan keluhan infrastruktur kota dalam dialek Banjar atau Indonesia. AI akan menormalisasi teks Anda secara real-time.
                    </p>
                    
                    <form onSubmit={handleWargaSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Nama Pelapor (Samaran)</label>
                        <input 
                          type="text" 
                          value={wargaPseudo}
                          onChange={(e) => setWargaPseudo(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                          placeholder="Contoh: Warga Pemurus"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Keluhan Anda</label>
                        <textarea
                          value={wargaText}
                          onChange={(e) => setWargaText(e.target.value)}
                          rows={4}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all resize-none"
                          placeholder="Tulis keluhan Anda... (Bisa Bahasa Banjar: 'Jalanan di Veteran lubangnya parah banar, kasihan motor amun lewat kada aman...')"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Unggah Bukti Foto</label>
                          <div className="flex items-center gap-4">
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-teal-500 transition-all bg-slate-50/50">
                              <div className="flex flex-col items-center justify-center pt-4 pb-4">
                                <ImageIcon className="h-6 w-6 text-slate-400 mb-1" />
                                <p className="text-[10px] text-slate-500 font-bold">Ambil Foto / Upload Gambar</p>
                                <p className="text-[8px] text-slate-400 mt-0.5">Mendukung Kamera HP & Galeri</p>
                              </div>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handlePhotoUpload} 
                                className="hidden" 
                              />
                            </label>
                            {photoPreview && (
                              <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                                <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setPhotoPreview(null);
                                    setWargaPhoto("");
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                          Alamat Lengkap / Keterangan Titik (Opsional jika memilih lewat peta)
                        </label>
                        <input
                          type="text"
                          value={customAddress}
                          onChange={(e) => setCustomAddress(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                          placeholder="Ketik alamat lengkap (misal: 'Veteran' atau 'Kayutangi') untuk auto-geser pin peta..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Pilih Titik Lokasi Detail di Peta</label>
                        <MapPicker 
                          lat={wargaCoords.lat} 
                          lng={wargaCoords.lng} 
                          onChange={(lat, lng) => setWargaCoords({ lat, lng })} 
                        />
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                          <span>Latitude: {wargaCoords.lat.toFixed(5)}</span>
                          <span>Longitude: {wargaCoords.lng.toFixed(5)}</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !wargaText}
                        className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs mt-4 shadow-sm shadow-teal-700/20 cursor-pointer"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Kirim Laporan Resmi
                      </button>
                    </form>
                  </div>

                  {submittedTicket && (
                    <div className="mt-6 border border-teal-100 bg-teal-50/50 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-teal-700 text-xs font-bold">
                        <CheckCircle className="h-4 w-4" />
                        Laporan Terkirim!
                      </div>
                      <p className="text-slate-600 text-[11px]">Salin ID Tiket untuk memantau status pengerjaan oleh Dinas:</p>
                      <div className="bg-white rounded border border-slate-200 px-3 py-2 flex items-center justify-between mt-1">
                        <code className="text-xs text-slate-800 font-mono font-bold">{submittedTicket.id}</code>
                        <button 
                          onClick={() => {
                            setTrackId(submittedTicket.id);
                            setSubmittedTicket(null);
                          }}
                          className="text-teal-700 hover:underline text-xs flex items-center gap-1 font-bold cursor-pointer"
                        >
                          Lacak Sekarang <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                        <span>*Simpan Token Konfirmasi Anda:</span>
                        <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-amber-600">{submittedTicket.token}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lacak Tiket */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-2">
                    <Search className="h-4 w-4 text-teal-700" />
                    Lacak Status & Transparansi Tiket
                  </h2>
                  <p className="text-xs text-slate-500 mb-6">Masukkan ID Tiket Anda untuk melihat tahapan pengerjaan dinas secara terbuka.</p>

                  <form onSubmit={handleTrack} className="flex gap-2 mb-6">
                    <input
                      type="text"
                      value={trackId}
                      onChange={(e) => setTrackId(e.target.value)}
                      placeholder="Masukkan ID Tiket (rpt_...)"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono focus:bg-white transition-all"
                      required
                    />
                    <button 
                      type="submit"
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      Lacak
                    </button>
                  </form>

                  {trackingError && (
                    <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl p-3 mb-4">{trackingError}</p>
                  )}

                  {trackedReport && (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tiket ID: <span className="font-mono text-slate-800">{trackedReport.id}</span></div>
                          <h3 className="text-sm font-extrabold text-slate-900 mt-1 capitalize flex items-center gap-2">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                              trackedReport.category === "sampah" ? "bg-purple-400" :
                              trackedReport.category === "drainase" ? "bg-blue-400" :
                              trackedReport.category === "jalan" ? "bg-pink-400" : "bg-amber-400"
                            }`}></span>
                            {trackedReport.category}
                          </h3>
                        </div>
                        <span className={`px-3 py-1 text-[10px] font-bold tracking-wide uppercase border rounded-full ${getStatusBadgeClass(trackedReport.status)}`}>
                          {trackedReport.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Before / After Images */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Foto Kejadian (Warga)</span>
                          {trackedReport.image_before ? (
                            <img src={trackedReport.image_before} className="w-full h-24 object-cover rounded-xl border border-slate-200 shadow-sm" alt="Foto Sebelum" />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-400">Tidak ada foto</div>
                          )}
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Foto Perbaikan (Dinas)</span>
                          {trackedReport.image_after ? (
                            <img src={trackedReport.image_after} className="w-full h-24 object-cover rounded-xl border border-slate-200 shadow-sm" alt="Foto Perbaikan" />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-400">Menunggu pengerjaan</div>
                          )}
                        </div>
                      </div>

                      {/* Transparan SMART & Normalization */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 relative group">
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Laporan Asli (Bahasa Banjar)</span>
                          <p className="text-xs text-slate-600 italic mt-0.5">"{trackedReport.text_original}"</p>
                        </div>
                        {trackedReport.text_normalized && trackedReport.text_normalized !== trackedReport.text_original && (
                          <div>
                            <span className="block text-[9px] font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1">
                              <Check className="h-3 w-3" /> Auto-Normalized (Indonesia Baku)
                            </span>
                            <p className="text-xs text-slate-800 mt-0.5 font-medium">"{trackedReport.text_normalized}"</p>
                          </div>
                        )}
                        
                        <div className="border-t border-slate-200 pt-3 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-bold">Skor Prioritas SMART:</span>
                            <span className="font-extrabold text-slate-800" style={{ color: getPriorityColor(trackedReport.priority) }}>
                              {trackedReport.priority} / 100
                            </span>
                          </div>
                          
                          {/* SMART Progress Bar */}
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ 
                                width: `${trackedReport.priority}%`,
                                backgroundColor: getPriorityColor(trackedReport.priority)
                              }}
                            />
                          </div>
                          <div className="text-[9px] text-slate-400 italic mt-0.5">*Arahkan kursor ke sini untuk melihat pembobotan SMART.</div>
                        </div>

                        {/* Interactive Tooltip Formula */}
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-3 rounded-xl border border-slate-800 shadow-xl z-50 w-72 leading-relaxed">
                          <div className="font-bold border-b border-slate-700 pb-1 mb-1.5 text-amber-400 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5" /> Rumus SMART Prioritas:
                          </div>
                          <div className="font-mono mb-2">P = 30U + 25D + 20V + 15T + 10R</div>
                          <div className="space-y-1 text-slate-300 font-mono text-[9px]">
                            <div>• U (Urgensi AI) = {trackedReport.priority_detail?.U || 25} (Bobot 30%)</div>
                            <div>• D (Duplikasi Laporan) = {trackedReport.priority_detail?.D || 25} (Bobot 25%)</div>
                            <div>• V (Kekuatan Bukti) = {trackedReport.priority_detail?.V || 0} (Bobot 20%)</div>
                            <div>• T (Waktu Tunggu) = {trackedReport.priority_detail?.T || 0} (Bobot 15%)</div>
                            <div>• R (Radius Dampak) = {trackedReport.priority_detail?.R || 25} (Bobot 10%)</div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="space-y-2">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perjalanan Pengaduan</span>
                        <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                          {trackedTimeline.map((evt, idx) => (
                            <div key={idx} className="relative pl-4 text-xs">
                              <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 border-2 border-white"></span>
                              <div className="font-bold text-slate-900 capitalize">{evt.status.replace("_", " ")}</div>
                              {evt.note && <div className="text-slate-500 font-medium text-[10px] mt-0.5">{evt.note}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Citizen confirmation box */}
                {trackedReport && trackedReport.status === "menunggu_konfirmasi" && (
                  <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-4 mt-6">
                    <h4 className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Konfirmasi Hasil Perbaikan
                    </h4>
                    <p className="text-[11px] text-slate-600 mb-3">Dinas menyatakan keluhan telah selesai dikerjakan. Masukkan token konfirmasi Anda untuk menutup kasus:</p>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={confirmToken}
                        onChange={(e) => setConfirmToken(e.target.value)}
                        placeholder="Token Konfirmasi"
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none flex-1 font-mono focus:border-amber-500"
                      />
                      <button
                        onClick={() => handleConfirmCompletion(confirmToken)}
                        className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        Konfirmasi Selesai
                      </button>
                    </div>
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
                  { label: "Total Pengaduan", val: reports.length, icon: FileText, color: "text-teal-700", bg: "bg-teal-50" },
                  { label: "Review Ambigu AI", val: reports.filter(r => typeof r.confidence === "number" && r.confidence < 0.8 && r.status === "terdeteksi").length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Kasus Kolektif Aktif", val: cases.length, icon: Building, color: "text-sky-600", bg: "bg-sky-50" },
                  { label: "Penyelesaian Selesai", val: reports.filter(r => r.status === "selesai").length, icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50" }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                      <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stat.val}</span>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shadow-inner`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Triage / Review Queue */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 lg:col-span-2">
                  <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Triage & Verifikasi AI (Laporan Ambigu)
                  </h3>

                  <div className="space-y-3 overflow-y-auto max-h-[450px] pr-2">
                    {reports
                      .filter(r => r.status === "terdeteksi")
                      .map((report) => (
                        <div 
                          key={report.id}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all hover:bg-slate-50/80 ${
                            reviewReport?.id === report.id ? "bg-teal-50/50 border-teal-500/30" : "bg-white border-slate-200"
                          }`}
                          onClick={() => {
                            setReviewReport(report);
                            setEditCategory(report.category);
                            const dinasMap: Record<string, string> = { sampah: "d-dlh", drainase: "d-pupr", jalan: "d-pupr", lampu: "d-dishub" };
                            setEditDinas(dinasMap[report.category] || "d-pupr");
                            setOperatorMsg("");
                          }}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-2">
                            <span className="font-mono text-slate-500 font-bold">{report.id}</span>
                            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                              Confidence: {typeof report.confidence === "number" ? Math.round(report.confidence * 100) : 0}%
                            </span>
                          </div>
                          
                          {/* Banjar original text & Normalized text display */}
                          <div className="space-y-1.5 mb-3">
                            <p className="text-xs text-slate-500 italic">Banjar: "{report.text_original}"</p>
                            {report.text_normalized && report.text_normalized !== report.text_original && (
                              <p className="text-xs text-slate-800 font-bold">Indo: "{report.text_normalized}"</p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                            <span>Kategori: <strong className="text-slate-800 capitalize">{report.category}</strong></span>
                            <span>Prioritas: <strong className="text-red-600">{report.priority}</strong></span>
                          </div>
                        </div>
                      ))}

                    {reports.filter(r => r.status === "terdeteksi").length === 0 && (
                      <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                        <CheckCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-bold">Semua laporan terverifikasi secara otomatis oleh AI!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Panel */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                  <h3 className="text-sm font-extrabold text-slate-900 mb-4">Panel Verifikasi Manual</h3>
                  
                  {reviewReport ? (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Isi Aduan</span>
                        <p className="text-xs text-slate-700 italic">"{reviewReport.text_original}"</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Koreksi Kategori</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white"
                        >
                          {["sampah", "drainase", "jalan", "lampu", "lainnya"].map(cat => (
                            <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Dinas Penerima</label>
                        <select
                          value={editDinas}
                          onChange={(e) => setEditDinas(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white"
                        >
                          {dinasList.map(d => (
                            <option key={d.id} value={d.id}>{d.short} — {d.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleOperatorTriage}
                        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-4"
                      >
                        <Check className="h-4 w-4" />
                        Tembuskan ke Dinas
                      </button>

                      {operatorMsg && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">{operatorMsg}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-24 text-xs text-slate-400 font-medium">
                      Pilih salah satu laporan di antrean sebelah kiri untuk melakukan review visual manual.
                    </div>
                  )}
                </div>
              </div>

              {/* Cases List */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                <h3 className="text-sm font-extrabold text-slate-900 mb-4">Kasus Kolektif Hasil Penggabungan (Clustered Cases)</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 font-bold">ID Kasus</th>
                        <th className="pb-3 font-bold">Kategori</th>
                        <th className="pb-3 font-bold">Nama Kasus & Volume Laporan</th>
                        <th className="pb-3 font-bold text-center">Bobot Prioritas</th>
                        <th className="pb-3 font-bold">Status</th>
                        <th className="pb-3 font-bold">Waktu Dibuat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cases.map((c) => (
                        <tr key={c.id} className="text-slate-700 hover:bg-slate-50/50">
                          <td className="py-4 font-mono text-slate-500 font-bold">{c.id}</td>
                          <td className="py-4 capitalize">
                            <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-full ${getCategoryBadgeClass(c.category)}`}>
                              {c.category}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="font-bold text-slate-900">{c.title}</span>
                            <div className="mt-1">
                              <span className="text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full w-max">
                                {c.report_count} Laporan Serupa Digabung
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-center font-bold text-red-600">{c.score} / 100</td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-full ${getStatusBadgeClass(c.status)}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-4 text-slate-400">{new Date(c.created_at).toLocaleString("id-ID")}</td>
                        </tr>
                      ))}

                      {cases.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">Belum ada kasus yang digabungkan. Jalankan simulasi duplikasi di panel kanan!</td>
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Pilih Dinas Eksekutor</h3>
                  <p className="text-xs text-slate-500">Tampilkan laporan yang didelegasikan sesuai penanggung jawab OPD terkait.</p>
                </div>
                
                <div className="flex gap-2 overflow-x-auto">
                  {dinasList.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDinas(d.id)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        selectedDinas === d.id 
                          ? "bg-teal-700 text-white font-bold shadow-sm" 
                          : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task list for Dinas */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                <h3 className="text-sm font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                  <Building className="h-4 w-4 text-teal-700" />
                  Antrean Tugas Operasional — {selectedDinas.toUpperCase()}
                </h3>

                <div className="space-y-4">
                  {reports
                    .filter(r => r.dinas_id === selectedDinas && ["diteruskan", "dikerjakan"].includes(r.status))
                    .map((report) => (
                      <div key={report.id} className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-6 hover:shadow-md transition-all">
                        
                        <div className="space-y-2.5 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono text-slate-500 font-bold text-xs">{report.id}</span>
                            <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-full ${getStatusBadgeClass(report.status)}`}>
                              {report.status}
                            </span>
                            
                            {/* SLA Countdown Timer */}
                            {renderSlaCountdown(report.sla_due)}
                          </div>

                          <div className="space-y-1">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Aduan Warga (Normalized)</span>
                            <p className="text-xs text-slate-800 font-bold">"{report.text_normalized || report.text_original}"</p>
                          </div>
                          
                          <div className="text-[10px] text-slate-500 font-medium">
                            Lokasi: <span className="text-slate-800 font-semibold">{report.location_text || "Banjarmasin"}</span>
                          </div>
                          
                          {/* Photo Before */}
                          {report.image_before && (
                            <div className="mt-2">
                              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bukti Awal</span>
                              <img src={report.image_before} className="w-32 h-20 object-cover rounded-xl border border-slate-200 shadow-sm" alt="Sebelum" />
                            </div>
                          )}
                        </div>

                        {/* Dinas Actions */}
                        <div className="flex md:flex-col gap-2 min-w-[150px]">
                          {report.status === "diteruskan" && (
                            <button
                              onClick={() => handleDinasAction(report.id, "dikerjakan")}
                              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              Ambil Tugas
                            </button>
                          )}
                          {report.status === "dikerjakan" && (
                            <button
                              onClick={() => handleDinasAction(report.id, "selesai")}
                              className="flex-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm shadow-teal-700/10"
                            >
                              Selesaikan & Unggah Bukti
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                  {reports.filter(r => r.dinas_id === selectedDinas && ["diteruskan", "dikerjakan"].includes(r.status)).length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
                      <CheckCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">Tidak ada laporan aktif yang perlu ditindaklanjuti.</p>
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
                  { label: "Total Keluhan Warga", val: reports.length, desc: "Seluruh aduan terdaftar", color: "text-teal-700" },
                  { label: "Sedang Dikerjakan Dinas", val: reports.filter(r => ["diteruskan", "dikerjakan"].includes(r.status)).length, desc: "Penugasan aktif OPD", color: "text-amber-600" },
                  { label: "Selesai Penanganan", val: reports.filter(r => r.status === "selesai").length, desc: "Dikonfirmasi warga", color: "text-emerald-700" },
                  { label: "SLA Compliance Rate", val: reports.length > 0 ? `${Math.round((reports.filter(r => r.status === "selesai" || (r.sla_due && new Date(r.sla_due) > new Date())).length / reports.length) * 100)}%` : "100%", desc: "Respons sesuai target waktu", color: "text-sky-700" }
                ].map((metric, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{metric.label}</span>
                    <span className={`text-2xl font-extrabold ${metric.color} mt-1 block`}>{metric.val}</span>
                    <span className="text-[10px] text-slate-400 mt-1 block font-medium">{metric.desc}</span>
                  </div>
                ))}
              </div>

              {/* Map & Explainer */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[480px]">
                
                {/* Map Panel */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 lg:col-span-2 h-[480px] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peta Sebaran Laporan & Prioritas SMART Kota Banjarmasin</h3>
                    <div className="flex gap-3 text-[10px] font-bold text-slate-600">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Kritis</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span> Tinggi</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> Sedang</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Rendah</span>
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden border border-slate-200">
                    <MapComponent reports={reports} />
                  </div>
                </div>

                {/* Explainer SMART */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden bg-sasirangan">
                  <div className="absolute inset-0 bg-white/95 z-0" />
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-1.5">
                        <Info className="h-4.5 w-4.5 text-teal-700" />
                        Metode Transparansi SMART
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        Prioritas penanganan keluhan dihitung secara terbuka menggunakan metode **SMART (Simple Multi-Attribute Rating Technique)** berbasis penelitian. Kami menghapus intervensi birokrasi subyektif agar alokasi APBD adil bagi warga kota.
                      </p>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-600 space-y-2">
                        <div className="font-extrabold text-slate-900 text-xs border-b border-slate-200 pb-1.5 mb-2">P = 30U + 25D + 20V + 15T + 10R</div>
                        <div>• **U** (30%): Urgensi risiko keselamatan</div>
                        <div>• **D** (25%): Jumlah laporan warga yang sama</div>
                        <div>• **V** (20%): Validitas bukti foto & lokasi</div>
                        <div>• **T** (15%): Lama waktu tunda pengerjaan</div>
                        <div>• **R** (10%): Radius dampak banjir (Geoportal)</div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 italic leading-normal">
                      *Kalkulasi prioritas dilakukan secara langsung di dalam database PostgreSQL melalui query PostGIS + pgvector setiap kali aduan baru masuk.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ─── RIGHT PANEL: DEMO CONTROL CENTER (25% Width) ─── */}
      <aside className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto relative bg-sasirangan">
        <div className="absolute inset-0 bg-white/96 z-0" />
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
              <Settings className="h-5 w-5 text-teal-700 animate-spin-slow" />
              <div>
                <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">Demo Control Center</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Storyline & Simulasi Lomba</p>
              </div>
            </div>

            {/* Action Simulation Buttons */}
            <div className="space-y-3">
              
              {/* RESET DATABASE */}
              <button
                onClick={handleDemoReset}
                disabled={simulating !== null}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {simulating === "reset" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Reset & Seeder Database
              </button>

              <div className="border-t border-slate-200 my-4 pt-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3">Simulasi Skenario</span>
                
                <div className="space-y-2">
                  {/* SCENARIO 1: BANJAR LANGUAGE */}
                  <button
                    onClick={() => handleDemoSimulate("banjar")}
                    disabled={simulating !== null}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs py-2.5 px-4 rounded-xl text-left transition-all border border-slate-200 flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span className="font-bold">1. Warga Melapor (Banjar)</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </button>

                  {/* SCENARIO 2: DUPLICATE MERGING */}
                  <button
                    onClick={() => handleDemoSimulate("duplicate")}
                    disabled={simulating !== null}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs py-2.5 px-4 rounded-xl text-left transition-all border border-slate-200 flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span className="font-bold">2. Duplikasi (PostGIS + pgvector)</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </button>

                  {/* SCENARIO 3: LOW CONFIDENCE REVIEW */}
                  <button
                    onClick={() => handleDemoSimulate("low_confidence")}
                    disabled={simulating !== null}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs py-2.5 px-4 rounded-xl text-left transition-all border border-slate-200 flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span className="font-bold">3. Antrean Triage Operator</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </button>

                  {/* SCENARIO 4: OVERDUE SLA ESCALATION */}
                  <button
                    onClick={() => handleDemoSimulate("sla_escalated")}
                    disabled={simulating !== null}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs py-2.5 px-4 rounded-xl text-left transition-all border border-slate-200 flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span className="font-bold">4. Laporan Overdue SLA</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Jukung / Illustration footer */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[10px] text-slate-500 space-y-2 mt-4 font-medium leading-relaxed relative">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Info className="h-3.5 w-3.5 text-teal-700" />
                  Alur Demo Tim
                </div>
                <p>
                  Klik skenario di atas secara berturut-turut untuk menyimulasikan siklus penuh tata kelola keluhan warga secara langsung di hadapan juri.
                </p>
                <div className="flex justify-end mt-2 opacity-30 select-none pointer-events-none">
                  {/* Wave and Jukung (boat) subtle layout ASCII/Visual symbol */}
                  <span className="font-mono text-xs text-teal-700">🛶 ~~~ ~~~</span>
                </div>
              </div>

            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-bold text-center flex flex-col gap-1">
            <div className="text-slate-600">Gawi Sabumi Tech — 2026</div>
            <div className="tracking-wider text-[9px]">Banjarmasin Smart City Ideathon</div>
          </div>
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
