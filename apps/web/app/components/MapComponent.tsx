"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { Report } from "@/lib/types";

interface MapComponentProps {
  reports: Report[];
  onSelectReport?: (report: Report) => void;
}

// ─── WMS via proxy Next.js (hindari CORS/ORB) ─────────────────────
const WMS_URL = "/geoserver/wms";
const WFS_URL = "/geoserver/wfs";

const WMS_OPTIONS: L.WMSOptions = {
  format: "image/png",
  transparent: true,
  version: "1.1.1",
};

interface GeoLayer {
  id: string;
  name: string;
  workspace: string;
  layer: string;
  group: string;
  desc: string;
  type: "wms" | "geojson";
  opacity?: number; // WMS opacity (0-1), default 0.7
}

// Layer GeoPortal — administrasi pakai GeoJSON (ada label nama),
// sisanya WMS tile overlay dengan opacity yang disesuaikan.
const GEO_LAYERS: GeoLayer[] = [
  { id: "adm_kota", name: "Batas Kecamatan", workspace: "BAGPEM", layer: "administrasi_ar_kota_banjarmasin", group: "Administrasi", desc: "5 kecamatan dengan nama", type: "geojson" },
  { id: "adm_kel", name: "Batas Kelurahan", workspace: "BAGPEM", layer: "administrasi_ar_kelurahan_sekota_banjarmasin", group: "Administrasi", desc: "52 kelurahan dengan nama", type: "geojson" },
  { id: "banjir", name: "Urgensi Banjir (CRIC 2023)", workspace: "BPBD", layer: "Urgensi_Banjir_CRIC_2023_AR100K_AR", group: "Risiko Bencana", desc: "Kawasan rawan banjir rob — BPBD", type: "wms", opacity: 0.5 },
  { id: "genangan", name: "Genangan Air 2025", workspace: "BPBD", layer: "Data_Genangan_Kota_Banjarmasin_2025_10K_AR", group: "Risiko Bencana", desc: "Data genangan air hujan — BPBD", type: "wms", opacity: 0.7 },
  { id: "kebakaran", name: "Rawan Kebakaran", workspace: "BPBD", layer: "RAWAN_KEBAKARAN_AR", group: "Risiko Bencana", desc: "Kawasan rawan kebakaran — Damkar", type: "wms", opacity: 0.7 },
  { id: "resiko_iklim", name: "Risiko Iklim Basah", workspace: "BPBD", layer: "Resiko_Iklim_Basah_CRIC_2023_AR100K_AR", group: "Risiko Bencana", desc: "Risiko iklim basah CRIC 2023", type: "wms", opacity: 0.5 },
  { id: "kumuh", name: "Permukiman Kumuh", workspace: "DPRKP", layer: "PERMUKIMAN_KUMUH_KOTA_BANJARMASIN_AR_50K", group: "Sosial", desc: "Kawasan permukiman kumuh — DPRKP", type: "wms", opacity: 0.7 },
  { id: "macet", name: "Titik Kemacetan", workspace: "DISHUB", layer: "TITIK_KEMACETAN_25K_PT", group: "Transportasi", desc: "Titik bottleneck kemacetan — Dishub", type: "wms", opacity: 0.9 },
  { id: "sungai", name: "Jaringan Sungai", workspace: "DPUPR", layer: "sungai_ln_kota_banjarmasin", group: "Transportasi", desc: "Jaringan sungai — DPUPR", type: "wms", opacity: 0.9 },
];

const GROUPS = ["Administrasi", "Risiko Bencana", "Sosial", "Transportasi"] as const;

const GROUP_COLORS: Record<string, string> = {
  Administrasi: "text-teal-600",
  "Risiko Bencana": "text-red-600",
  Sosial: "text-purple-600",
  Transportasi: "text-amber-600",
};

// Palet warna untuk poligon (ditetapkan per kecamatan/kelurahan)
const AREA_COLORS = [
  "#0d9488", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4",
  "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#e11d48",
  "#a855f7", "#eab308", "#3b82f6", "#10b981", "#f43f5e",
  "#7c3aed", "#059669", "#d946ef", "#0891b2", "#65a30d",
];

// Ambil warna stabil berdasarkan nama (nama sama = warna sama)
function getAreaColor(name: string, index: number): string {
  // Hash nama untuk distribusi warna yang konsisten
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AREA_COLORS[Math.abs(hash) % AREA_COLORS.length] ?? AREA_COLORS[index % AREA_COLORS.length];
}

function getPriorityColorHex(priority: number): string {
  if (priority >= 75) return "#ef4444";
  if (priority >= 50) return "#f97316";
  if (priority >= 25) return "#eab308";
  return "#10b981";
}

// Ambil GeoJSON dari WFS proxy
async function fetchWfsGeoJSON(workspace: string, layer: string): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const url = `${WFS_URL}?service=WFS&version=1.1.0&request=GetFeature&typeName=${workspace}:${layer}&outputFormat=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function MapComponent({ reports, onSelectReport }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reportLayerRef = useRef<L.LayerGroup | null>(null);
  const wmsLayersRef = useRef<Record<string, L.TileLayer.WMS>>({});
  const geojsonLayersRef = useRef<Record<string, L.GeoJSON>>({});

  const [activeLayers, setActiveLayers] = useState<string[]>([]);

  // Inisialisasi peta
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    if (!mapRef.current) {
      const bounds = L.latLngBounds(L.latLng(-3.46, 114.50), L.latLng(-3.25, 114.68));

      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        maxBounds: bounds.pad(0.1),
        maxBoundsViscosity: 0.8,
        minZoom: 11,
      }).setView([-3.3194, 114.5908], 12);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(mapRef.current);

      reportLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, []);

  // Toggle GeoJSON layer (administrasi — dengan label nama)
  const addGeoJsonLayer = async (layerId: string) => {
    const geo = GEO_LAYERS.find((g) => g.id === layerId);
    if (!geo || !mapRef.current) return;

    const data = await fetchWfsGeoJSON(geo.workspace, geo.layer);
    if (!data || !mapRef.current) return;

    const isKecamatan = layerId === "adm_kota";

    const geojsonLayer = L.geoJSON(data as GeoJSON.GeoJsonObject, {
      style: (feature) => {
        const props = feature?.properties as Record<string, string> | null;
        // Kecamatan pakai WADMKC, kelurahan pakai WADMKD — jangan sampai
        // semua kelurahan dalam satu kecamatan dapat warna sama
        const name = isKecamatan
          ? props?.WADMKC || props?.NAMOBJ || ""
          : props?.WADMKD || props?.NAMOBJ || "";
        const idx = feature?.id ? Number(feature.id) || 0 : 0;
        const color = getAreaColor(name, idx);

        return {
          color: color,
          weight: isKecamatan ? 3 : 1.5,
          opacity: 0.85,
          fillColor: color,
          fillOpacity: isKecamatan ? 0.12 : 0.18,
          dashArray: isKecamatan ? undefined : "4 3",
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties as Record<string, string> | null;
        if (!props) return;

        // Hover highlight
        layer.on("mouseover", () => {
          if (layer instanceof L.Polygon) {
            layer.setStyle({ weight: isKecamatan ? 4 : 3, fillOpacity: isKecamatan ? 0.28 : 0.35 });
          }
        });
        layer.on("mouseout", () => {
          if (layer instanceof L.Polygon) {
            layer.setStyle({ weight: isKecamatan ? 3 : 1.5, fillOpacity: isKecamatan ? 0.12 : 0.18 });
          }
        });

        if (isKecamatan) {
          // Label kecamatan — bold, selalu tampil
          const name = props.WADMKC || props.NAMOBJ || "";
          if (name) {
            layer.bindTooltip(name, {
              permanent: true,
              direction: "center",
              className: "kecamatan-label",
            });
          }
        } else {
          // Label kelurahan — kecil, tampil saat zoom >= 13
          const name = props.WADMKD || props.NAMOBJ || "";
          const kec = props.WADMKC || "";
          if (name) {
            layer.bindTooltip(name, {
              permanent: true,
              direction: "center",
              className: "kelurahan-label",
            });
            layer.bindPopup(
              `<div style="font-family:sans-serif;min-width:140px;">
                <strong style="color:#1f2937;font-size:13px;">Kel. ${name}</strong><br/>
                <span style="font-size:11px;color:#6b7280;">Kec. ${kec}</span><br/>
                <span style="font-size:10px;color:#9ca3af;">Kota Banjarmasin</span>
              </div>`
            );
          }
        }
      },
    });

    geojsonLayer.addTo(mapRef.current);
    geojsonLayersRef.current[layerId] = geojsonLayer;

    // Sembunyikan label kelurahan saat zoom terlalu jauh
    if (!isKecamatan && mapRef.current) {
      const updateVisibility = () => {
        const zoom = mapRef.current!.getZoom();
        geojsonLayer.eachLayer((l) => {
          if (l instanceof L.Polygon) {
            const tooltip = l.getTooltip();
            if (tooltip) {
              const el = tooltip.getElement();
              if (el) el.style.display = zoom >= 13 ? "" : "none";
            }
          }
        });
      };
      mapRef.current.on("zoomend", updateVisibility);
      updateVisibility();
    }
  };

  // Toggle layer (WMS atau GeoJSON)
  const toggleLayer = async (layerId: string) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (activeLayers.includes(layerId)) {
      // Matikan
      if (wmsLayersRef.current[layerId]) {
        map.removeLayer(wmsLayersRef.current[layerId]);
        delete wmsLayersRef.current[layerId];
      }
      if (geojsonLayersRef.current[layerId]) {
        map.removeLayer(geojsonLayersRef.current[layerId]);
        delete geojsonLayersRef.current[layerId];
      }
      setActiveLayers(activeLayers.filter((id) => id !== layerId));
    } else {
      // Nyalakan
      const geo = GEO_LAYERS.find((g) => g.id === layerId);
      if (!geo) return;

      if (geo.type === "geojson") {
        await addGeoJsonLayer(layerId);
      } else {
        const wms = L.tileLayer.wms(WMS_URL, {
          ...WMS_OPTIONS,
          layers: `${geo.workspace}:${geo.layer}`,
          opacity: geo.opacity ?? 0.7,
        });
        wms.addTo(map);
        wmsLayersRef.current[layerId] = wms;
      }
      setActiveLayers([...activeLayers, layerId]);
    }
  };

  // Update markers laporan warga + titik perbaikan
  useEffect(() => {
    if (!mapRef.current || !reportLayerRef.current) return;
    reportLayerRef.current.clearLayers();

    // Icon pin hijau untuk titik perbaikan (selesai + ada koordinat)
    const repairIcon = L.divIcon({
      className: "repair-done-pin",
      html: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
    });

    reports.forEach((report) => {
      const lat = report.latitude;
      const lng = report.longitude;
      if (lat && lng && Number.isFinite(lat) && Number.isFinite(lng)) {
        // Marker perbaikan (hijau) — untuk laporan selesai dengan koordinat perbaikan
        if (report.repair_lat && report.repair_lng && report.status === "selesai") {
          const repairMarker = L.marker([report.repair_lat, report.repair_lng], {
            icon: repairIcon,
            zIndexOffset: 500,
          });
          repairMarker.bindPopup(
            `<div style="font-family:sans-serif;min-width:150px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#059669"></span>
                <strong style="color:#059669;font-size:12px;">Titik Perbaikan</strong>
              </div>
              <p style="margin:0;font-size:11px;color:#4b5563;">${report.location_text || "Lokasi perbaikan"}</p>
              <div style="margin-top:4px;font-size:10px;color:#9ca3af;">
                ${report.id} &middot; ${report.category} &middot; Selesai
              </div>
            </div>`
          );
          reportLayerRef.current!.addLayer(repairMarker);
        }

        // Marker laporan (warna prioritas) — tetap tampil
        const priorityColor = getPriorityColorHex(report.priority);
        const marker = L.circleMarker([lat, lng], {
          radius: report.status === "selesai" ? 5 : 8,
          fillColor: priorityColor,
          color: "#ffffff",
          weight: 2,
          opacity: report.status === "selesai" ? 0.5 : 0.9,
          fillOpacity: report.status === "selesai" ? 0.4 : 0.8,
        });
        marker.bindPopup(
          `<div style="font-family:sans-serif;min-width:160px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${priorityColor}"></span>
              <strong style="text-transform:capitalize;color:#1f2937;">${report.category}</strong>
            </div>
            <p style="margin:0 0 4px;font-size:12px;color:#4b5563;">${report.location_text || "Lokasi terdeteksi"}</p>
            <div style="font-size:11px;color:#9ca3af;display:flex;justify-content:space-between;">
              <span>Status: <strong style="color:#374151;text-transform:capitalize">${report.status.replaceAll("_", " ")}</strong></span>
              <span>Prio: <strong style="color:${priorityColor}">${report.priority}</strong></span>
            </div>
          </div>`
        );
        if (onSelectReport) marker.on("click", () => onSelectReport(report));
        reportLayerRef.current!.addLayer(marker);
      }
    });
  }, [reports, onSelectReport]);

  return (
    <div className="relative h-full w-full min-h-[350px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div ref={containerRef} className="absolute inset-0 z-10 h-full w-full" />

      {/* Layer Manager */}
      <div className="absolute top-3 right-3 z-40 max-h-[calc(100%-24px)] w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Layer GeoPortal Banjarmasin
          </p>
          <p className="mt-0.5 text-[9px] text-slate-400">
            Klik untuk melihat nama wilayah
          </p>
        </div>
        <div className="space-y-1 px-2 py-2">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className={`px-2 py-1.5 text-[9px] font-extrabold uppercase tracking-wider ${GROUP_COLORS[group]}`}>
                {group}
              </p>
              {GEO_LAYERS.filter((l) => l.group === group).map((layer) => (
                <label
                  key={layer.id}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100/80"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeLayers.includes(layer.id)}
                      onChange={() => toggleLayer(layer.id)}
                      className="h-3.5 w-3.5 cursor-pointer rounded accent-teal-700"
                    />
                    <div className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-slate-700">
                        {layer.name}
                      </span>
                      <span className="block truncate text-[9px] text-slate-400">
                        {layer.desc}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-[8px] italic text-slate-400">
            Sumber: geoportal.banjarmasinkota.go.id
          </p>
        </div>
      </div>

      {/* Legend prioritas */}
      <div className="absolute bottom-3 left-3 z-40 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
          Prioritas Laporan
        </p>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Kritis
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-400" /> Tinggi
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" /> Sedang
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Rendah
          </span>
        </div>
      </div>
    </div>
  );
}
