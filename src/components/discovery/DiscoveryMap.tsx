"use client";

import L from "leaflet";
import { useCallback, useEffect, useRef } from "react";
import type { StudioWithClasses } from "@/app/actions/discover";

const DEFAULT_CENTER: [number, number] = [40.7, -74.0];
const DEFAULT_ZOOM = 11;

type DiscoveryMapProps = {
  studios: StudioWithClasses[];
  onBoundsChange?: (bounds: { south: number; west: number; north: number; east: number }) => void;
  selectedStudioId: string | null;
  onSelectStudio: (id: string | null) => void;
  className?: string;
};

export function DiscoveryMap({
  studios,
  onBoundsChange,
  selectedStudioId,
  onSelectStudio,
  className = "",
}: DiscoveryMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const setBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map || !onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });
  }, [onBoundsChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    map.on("moveend", setBounds);
    setBounds();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const icon = L.divIcon({
      className: "custom-marker",
      html: `<span class="bg-stone-900 rounded-full w-4 h-4 border-2 border-white shadow block"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    studios.forEach((studio) => {
      const lat = studio.latitude;
      const lng = studio.longitude;
      if (lat == null || lng == null) return;

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .on("click", () => {
          onSelectStudio(selectedStudioId === studio.id ? null : studio.id);
        });
      markersRef.current.push(marker);
    });
  }, [studios, selectedStudioId, onSelectStudio]);

  return <div ref={containerRef} className={`h-full w-full min-h-[320px] ${className}`} />;
}
