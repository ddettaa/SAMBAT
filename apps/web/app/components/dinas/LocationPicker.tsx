"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  reportLat?: number | null;
  reportLng?: number | null;
}

// Peta mini dengan pin yang bisa di-drag atau klik untuk memindah.
// Menampilkan lingkaran teal sebagai referensi lokasi laporan asli,
// dan marker oranye draggable sebagai lokasi perbaikan.
export default function LocationPicker({
  lat,
  lng,
  onChange,
  reportLat,
  reportLng,
}: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Cegah loop: saat update berasal dari drag/klik peta, jangan re-set marker
  const fromMap = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Load leaflet CSS sekali
    const existingLink = document.querySelector('link[href*="leaflet"]');
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const center: L.LatLngExpression = [lat || -3.3194, lng || 114.5908];

    // Inisialisasi peta
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false, // cegah zoom tak sengaja saat scroll halaman
      attributionControl: false,
      dragging: true,
    }).setView(center, 16);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Marker lokasi laporan asli (referensi — lingkaran teal statis)
    if (reportLat && reportLng) {
      L.circleMarker([reportLat, reportLng], {
        radius: 10,
        color: "#0f766e",
        weight: 2,
        fillColor: "#0f766e",
        fillOpacity: 0.2,
      })
        .addTo(map)
        .bindTooltip("Lokasi laporan warga", {
          permanent: false,
          direction: "top",
        });
    }

    // Pin lokasi perbaikan — draggable
    const repairIcon = L.divIcon({
      className: "repair-pin",
      html: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    const marker = L.marker(center, {
      draggable: true,
      icon: repairIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    marker.bindTooltip("Geser pin ke lokasi perbaikan", {
      permanent: false,
      direction: "top",
    });

    // Update saat drag selesai
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      fromMap.current = true;
      onChange(pos.lat, pos.lng);
    });

    // Update saat marker di-drag real-time (opsional, lebih responsif)
    marker.on("drag", () => {
      const pos = marker.getLatLng();
      fromMap.current = true;
      onChange(pos.lat, pos.lng);
    });

    // Klik peta untuk pindahkan pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      fromMap.current = true;
      onChange(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Cleanup saat komponen unmount
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount sekali — lat/lng initial saja

  // Sync marker saat lat/lng berubah dari input eksternal (bukan dari peta)
  useEffect(() => {
    if (markerRef.current && mapRef.current && !fromMap.current) {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.panTo([lat, lng], { animate: true });
      }
    }
    fromMap.current = false;
  }, [lat, lng]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div ref={containerRef} className="h-52 w-full" />
    </div>
  );
}
