"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface RepairMapProps {
  reportLat: number;
  reportLng: number;
  repairLat: number;
  repairLng: number;
}

// Mini map menampilkan lokasi laporan vs lokasi perbaikan.
// Lingkaran teal = laporan warga, pin hijau = lokasi perbaikan dinas.
export default function RepairMap({
  reportLat,
  reportLng,
  repairLat,
  repairLng,
}: RepairMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const existingLink = document.querySelector('link[href*="leaflet"]');
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Center di antara dua titik
    const midLat = (reportLat + repairLat) / 2;
    const midLng = (reportLng + repairLng) / 2;
    const distance = Math.sqrt(
      Math.pow(repairLat - reportLat, 2) + Math.pow(repairLng - reportLng, 2)
    );
    const zoom = distance > 0.01 ? 14 : distance > 0.001 ? 16 : 17;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
      dragging: false,
      doubleClickZoom: false,
    }).setView([midLat, midLng], zoom);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Lokasi laporan (lingkaran teal)
    L.circleMarker([reportLat, reportLng], {
      radius: 8,
      color: "#0f766e",
      weight: 2,
      fillColor: "#0f766e",
      fillOpacity: 0.2,
    })
      .addTo(map)
      .bindTooltip("Lokasi laporan", { direction: "top", offset: [0, -8] });

    // Lokasi perbaikan (pin hijau)
    const repairIcon = L.divIcon({
      className: "repair-done-pin",
      html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    L.marker([repairLat, repairLng], { icon: repairIcon })
      .addTo(map)
      .bindTooltip("Lokasi perbaikan", { direction: "top", offset: [0, -20] });

    // Garis penghubung jika lokasi berbeda
    if (distance > 0.0001) {
      L.polyline(
        [
          [reportLat, reportLng],
          [repairLat, repairLng],
        ],
        { color: "#94a3b8", weight: 1.5, dashArray: "4 4" }
      ).addTo(map);

      // Fit bounds ke kedua titik
      map.fitBounds(
        L.latLngBounds([
          [reportLat, reportLng],
          [repairLat, repairLng],
        ]).pad(0.3)
      );
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [reportLat, reportLng, repairLat, repairLng]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div ref={containerRef} className="h-44 w-full" />
    </div>
  );
}
