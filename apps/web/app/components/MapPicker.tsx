"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Load leaflet css dynamically on client side
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([lat, lng], 13);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20
      }).addTo(mapRef.current);

      // Create a red circle marker that is draggable, or a standard icon
      // Standard Leaflet marker icon asset paths can break in Next.js builds.
      // So we will use a custom colored CircleMarker which is highly reliable!
      markerRef.current = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({
          html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          className: "custom-marker-pin",
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        })
      }).addTo(mapRef.current);

      markerRef.current.on("dragend", () => {
        if (markerRef.current) {
          const position = markerRef.current.getLatLng();
          onChange(position.lat, position.lng);
        }
      });

      mapRef.current.on("click", (e) => {
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
          onChange(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    return () => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, []);

  // Sync props changes (e.g. click presets)
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lng) > 0.0001) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 14);
      }
    }
  }, [lat, lng]);

  return (
    <div className="relative w-full h-44 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner">
      <div ref={containerRef} className="w-full h-full absolute inset-0 z-10" />
    </div>
  );
}
