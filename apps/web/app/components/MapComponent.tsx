"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

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

export default function MapComponent({ reports, onSelectReport }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Load leaflet css dynamically on client side
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Initialize Map
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([-3.3194, 114.5908], 13); // Center of Banjarmasin

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);

      layerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    // Clear previous markers
    layerGroupRef.current.clearLayers();

    // Add new markers
    reports.forEach((report) => {
      // Handle both geo_point object or direct lat/lng fields
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

        // Popup Content
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

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div ref={containerRef} className="w-full h-full absolute inset-0 z-10" />
    </div>
  );
}
