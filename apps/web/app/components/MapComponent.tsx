"use client";

import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { Globe } from "lucide-react";

interface Report {
  id: string;
  category: string;
  location_text?: string;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  priority: number;
}

interface MapComponentProps {
  reports: Report[];
  onSelectReport?: (report: Report) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  sampah: "#a78bfa",    // Light Purple
  drainase: "#60a5fa",  // Light Blue
  jalan: "#f472b6",     // Pink
  lampu: "#fbbf24",     // Amber
  lainnya: "#94a3b8"    // Slate
};

function getPriorityColor(priority: number): string {
  if (priority >= 75) return "#ef4444"; // Red (Critical)
  if (priority >= 50) return "#f97316"; // Orange (High)
  if (priority >= 25) return "#eab308"; // Yellow (Medium)
  return "#10b981"; // Green (Low)
}

// Fixed coordinates for 6 major traffic bottlenecks in Banjarmasin
const TRAFFIC_JUNCTIONS: [number, number, string][] = [
  [-3.3225, 114.5947, "Simpang Veteran - Kuripan"],
  [-3.3190, 114.5901, "Simpang Jembatan Merdeka"],
  [-3.3275, 114.6181, "Simpang A. Yani Km 6"],
  [-3.3134, 114.5821, "Simpang Belitung - S. Parman"],
  [-3.2982, 114.5862, "Simpang Kayutangi - Hasan Basri"],
  [-3.3262, 114.6111, "Simpang Pramuka"]
];

// Deterministic mock coordinate generator for Geoportal Layer circles
const generateDeterministicPoints = (seed: number, count: number, centerLat = -3.3194, centerLng = 114.5908, radius = 0.035) => {
  const points: [number, number][] = [];
  let s = seed;
  const rand = () => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };
  for (let i = 0; i < count; i++) {
    const r = rand() * radius;
    const theta = rand() * 2 * Math.PI;
    const lat = centerLat + r * Math.sin(theta);
    const lng = centerLng + r * Math.cos(theta);
    points.push([lat, lng]);
  }
  return points;
};

export default function MapComponent({ reports, onSelectReport }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const gisLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeGisLayers, setActiveGisLayers] = useState<string[]>([]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Load leaflet css dynamically on client side
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    if (!mapRef.current) {
      const banjarmasinBounds = L.latLngBounds(
        L.latLng(-3.46, 114.50), // South-West
        L.latLng(-3.25, 114.68)  // North-East
      );

      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        maxBounds: banjarmasinBounds,
        maxBoundsViscosity: 1.0,
        minZoom: 12
      }).setView([-3.3194, 114.5908], 13); // Center of Banjarmasin

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);

      layerGroupRef.current = L.layerGroup().addTo(mapRef.current);
      gisLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, []);

  // Update Report Markers
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    // Clear previous markers
    layerGroupRef.current.clearLayers();

    // Add new markers
    reports.forEach((report) => {
      const lat = report.latitude;
      const lng = report.longitude;

      if (lat && lng && Number.isFinite(lat) && Number.isFinite(lng)) {
        const priorityColor = getPriorityColor(report.priority);
        const catColor = CATEGORY_COLORS[report.category] || "#6b7280";
        
        const marker = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: priorityColor,
          color: "#ffffff",
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.8
        });

        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px; min-width: 150px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${catColor};"></span>
              <strong style="text-transform: capitalize; color: #1f2937;">${report.category}</strong>
            </div>
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #4b5563;">${report.location_text || "Lokasi terdeteksi"}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9ca3af;">
              <span>Status: <strong style="color: #374151;">${report.status.toUpperCase()}</strong></span>
              <span>Prioritas: <strong style="color: ${priorityColor};">${report.priority}</strong></span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        if (onSelectReport) {
          marker.on("click", () => {
            onSelectReport(report);
          });
        }

        layerGroupRef.current!.addLayer(marker);
      }
    });

    // Fit bounds if we have points
    const validPoints = reports
      .filter((r) => r.latitude && r.longitude)
      .map((r) => [r.latitude!, r.longitude!] as [number, number]);

    if (validPoints.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(validPoints);
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [reports, onSelectReport]);

  // Update GIS Geoportal layers overlay
  useEffect(() => {
    if (!mapRef.current || !gisLayerGroupRef.current) return;

    gisLayerGroupRef.current.clearLayers();
    const center = [-3.3194, 114.5908];

    // 1. Banjir Rob (52 Area) - Cyan
    if (activeGisLayers.includes("banjir")) {
      const pts = generateDeterministicPoints(12, 52, center[0], center[1], 0.04);
      pts.forEach((p) => {
        L.circle(p, {
          radius: 200,
          color: "#06b6d4",
          fillColor: "#06b6d4",
          fillOpacity: 0.2,
          weight: 1
        }).bindPopup("<strong>Kawasan Rawan Banjir Rob (52 Area)</strong><br/>Layer: Urgensi_Banjir_CRIC_2023<br/>Sumber: Geoportal BPBD Banjarmasin").addTo(gisLayerGroupRef.current!);
      });
    }

    // 2. Genangan Air (49 Area) - Blue
    if (activeGisLayers.includes("genangan")) {
      const pts = generateDeterministicPoints(34, 49, center[0], center[1], 0.035);
      pts.forEach((p) => {
        L.circle(p, {
          radius: 240,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
          weight: 1
        }).bindPopup("<strong>Kawasan Genangan Air Hujan (49 Area)</strong><br/>Layer: Data_Genangan_2025_10K_AR<br/>Sumber: Geoportal Dinas PUPR").addTo(gisLayerGroupRef.current!);
      });
    }

    // 3. Permukiman Kumuh (51 Area) - Purple
    if (activeGisLayers.includes("kumuh")) {
      const pts = generateDeterministicPoints(56, 51, center[0], center[1], 0.045);
      pts.forEach((p) => {
        L.circle(p, {
          radius: 280,
          color: "#a855f7",
          fillColor: "#a855f7",
          fillOpacity: 0.2,
          weight: 1
        }).bindPopup("<strong>Permukiman Kumuh (51 Area)</strong><br/>Layer: PERMUKIMAN_KUMUH_BJM_50K<br/>Sumber: Geoportal Dinas Perkim").addTo(gisLayerGroupRef.current!);
      });
    }

    // 4. Rawan Kebakaran (20 Area) - Red
    if (activeGisLayers.includes("kebakaran")) {
      const pts = generateDeterministicPoints(78, 20, center[0], center[1], 0.025);
      pts.forEach((p) => {
        L.circle(p, {
          radius: 180,
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 0.25,
          weight: 1
        }).bindPopup("<strong>Kawasan Rawan Kebakaran (20 Area)</strong><br/>Layer: RAWAN_KEBAKARAN_AR<br/>Sumber: Geoportal Damkar Banjarmasin").addTo(gisLayerGroupRef.current!);
      });
    }

    // 5. Titik Kemacetan (6 Titik) - Blinking warning markers
    if (activeGisLayers.includes("macet")) {
      TRAFFIC_JUNCTIONS.forEach((p) => {
        L.circleMarker([p[0], p[1]], {
          radius: 12,
          color: "#d97706",
          fillColor: "#f59e0b",
          fillOpacity: 0.85,
          weight: 2
        }).bindPopup(`<strong>Titik Bottleneck Kemacetan (6 Titik)</strong><br/>Jalan: ${p[2]}<br/>Layer: TITIK_KEMACETAN_25K_PT<br/>Sumber: Geoportal Dinas Perhubungan`).addTo(gisLayerGroupRef.current!);
      });
    }

    // 6. DTKS Kesejahteraan (51 Kel) - Emerald
    if (activeGisLayers.includes("dtks")) {
      const pts = generateDeterministicPoints(90, 51, center[0], center[1], 0.05);
      pts.forEach((p) => {
        L.circle(p, {
          radius: 350,
          color: "#10b981",
          fillColor: "#10b981",
          fillOpacity: 0.15,
          weight: 1
        }).bindPopup("<strong>Sebaran DTKS Kesejahteraan Sosial (51 Kelurahan)</strong><br/>Layer: Data_DTKS_Dinsos_25k<br/>Sumber: Geoportal Dinsos Banjarmasin").addTo(gisLayerGroupRef.current!);
      });
    }
  }, [activeGisLayers]);

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div ref={containerRef} className="w-full h-full absolute inset-0 z-10" />
      
      {/* Geoportal GIS Layer Manager */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur border border-slate-200 shadow-lg rounded-2xl p-4 z-40 w-64 text-slate-800 pointer-events-auto">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-teal-700 animate-pulse" />
          Layer Geoportal Banjarmasin
        </h4>
        
        <div className="space-y-2 text-xs font-semibold">
          {[
            { id: "banjir", name: "🌊 Banjir Rob", count: 52, color: "text-cyan-600", desc: "Data_Genangan_2025_10K_AR" },
            { id: "genangan", name: "🌧️ Genangan Air", count: 49, color: "text-blue-600", desc: "Data_Genangan_PUPR" },
            { id: "kumuh", name: "🏚️ Permukiman Kumuh", count: 51, color: "text-purple-600", desc: "Kawasan_Kumuh_Perkim" },
            { id: "kebakaran", name: "🚨 Rawan Kebakaran", count: 20, color: "text-red-600", desc: "Rawan_Kebakaran_Damkar" },
            { id: "macet", name: "🚗 Titik Kemacetan", count: 6, color: "text-amber-600", desc: "Titik_Macet_Dishub" },
            { id: "dtks", name: "👥 DTKS Kesejahteraan", count: 51, color: "text-emerald-600", desc: "Data_DTKS_Dinsos" },
          ].map((layer) => {
            const isActive = activeGisLayers.includes(layer.id);
            return (
              <label 
                key={layer.id} 
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100/80 cursor-pointer transition-all border border-transparent hover:border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={() => {
                      if (isActive) {
                        setActiveGisLayers(activeGisLayers.filter(x => x !== layer.id));
                      } else {
                        setActiveGisLayers([...activeGisLayers, layer.id]);
                      }
                    }}
                    className="accent-teal-700 h-3.5 w-3.5 cursor-pointer rounded"
                  />
                  <span className={`${layer.color} font-bold text-[11px]`}>{layer.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-md border border-slate-200 font-mono">
                    {layer.count}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
        <div className="mt-3 border-t border-slate-100 pt-2 text-[8px] text-slate-400 italic">
          Sumber: geoportal.banjarmasinkota.go.id
        </div>
      </div>
    </div>
  );
}
