"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAllStudiosForDiscovery,
  getStudiosInBounds,
  type Bounds,
  type DiscoverFilters,
  type StudioWithClasses,
} from "@/app/actions/discover";
import { DAY_NAMES } from "@/types/database";

const DiscoveryMap = dynamic(() => import("./DiscoveryMap").then((m) => ({ default: m.DiscoveryMap })), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center bg-stone-200 text-stone-500">Loading map…</div>,
});

function formatTime(t: string) {
  return new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function DiscoveryView({ initialStudios }: { initialStudios: StudioWithClasses[] }) {
  const [studios, setStudios] = useState<StudioWithClasses[]>(initialStudios);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const boundsRef = useRef<Bounds | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStudios = useCallback(
    async (bounds: Bounds | null) => {
      setLoading(true);
      try {
        const list = bounds
          ? await getStudiosInBounds(bounds, filters)
          : await getAllStudiosForDiscovery(filters);
        setStudios(list);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const handleBoundsChange = useCallback(
    (bounds: Bounds) => {
      boundsRef.current = bounds;
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => fetchStudios(bounds), 300);
    },
    [fetchStudios]
  );

  const applyFilters = useCallback(
    (overrides?: Partial<DiscoverFilters>) => {
      const f = { ...filters, ...overrides, query: searchQuery || undefined };
      const bounds = boundsRef.current;
      setLoading(true);
      (bounds ? getStudiosInBounds(bounds, f) : getAllStudiosForDiscovery(f))
        .then(setStudios)
        .finally(() => setLoading(false));
    },
    [filters, searchQuery]
  );

  useEffect(() => {
    const f = { ...filters, query: searchQuery || undefined };
    setLoading(true);
    (boundsRef.current
      ? getStudiosInBounds(boundsRef.current, f)
      : getAllStudiosForDiscovery(f))
      .then(setStudios)
      .finally(() => setLoading(false));
  }, [filters.category, filters.trialOnly, filters.dayOfWeek]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ query: searchQuery || undefined });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      <div className="flex w-full flex-col border-r border-stone-200 bg-white md:w-[380px] md:flex-shrink-0">
        <div className="border-b border-stone-200 p-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="search"
              placeholder="Search studios, classes, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Search
            </button>
          </form>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={filters.category ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value || undefined }))
              }
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
            >
              <option value="">All types</option>
              <option value="Yoga">Yoga</option>
              <option value="Pilates">Pilates</option>
              <option value="HIIT">HIIT</option>
              <option value="Strength">Strength</option>
              <option value="Dance">Dance</option>
              <option value="Cycling">Cycling</option>
              <option value="Barre">Barre</option>
              <option value="Meditation">Meditation</option>
              <option value="Other">Other</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={filters.trialOnly ?? false}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, trialOnly: e.target.checked || undefined }))
                }
                className="rounded border-stone-300"
              />
              Free trial only
            </label>
            <select
              value={filters.dayOfWeek ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  dayOfWeek: e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
            >
              <option value="">Any day</option>
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <p className="py-2 text-sm text-stone-500">Loading...</p>
          )}
          {!loading && studios.length === 0 && (
            <p className="py-4 text-center text-sm text-stone-500">
              No studios or classes match. Try moving the map or changing filters.
            </p>
          )}
          <ul className="space-y-2">
            {studios.map((studio) => (
              <li key={studio.id}>
                <Link
                  href={`/studios/${studio.slug}`}
                  onMouseEnter={() => setSelectedStudioId(studio.id)}
                  onMouseLeave={() => setSelectedStudioId(null)}
                  className={`block rounded-lg border p-3 transition ${
                    selectedStudioId === studio.id
                      ? "border-stone-400 bg-stone-100"
                      : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <div className="font-medium text-stone-900">{studio.name}</div>
                  {studio.address && (
                    <div className="text-xs text-stone-500">{studio.address}</div>
                  )}
                  {studio.offers_trial && (
                    <span className="mt-1 inline-block text-xs font-medium text-emerald-600">
                      Free trial
                    </span>
                  )}
                  {studio.classes?.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-stone-600">
                      {studio.classes.slice(0, 3).map((c) => (
                        <li key={c.id}>
                          {c.category ? `${c.category} · ` : ""}
                          {c.name} — {DAY_NAMES[c.day_of_week]} {formatTime(c.start_time)}
                        </li>
                      ))}
                      {studio.classes.length > 3 && (
                        <li className="text-stone-400">+{studio.classes.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="relative flex-1 bg-stone-200">
        <DiscoveryMap
          studios={studios.filter((s) => s.latitude != null && s.longitude != null)}
          onBoundsChange={handleBoundsChange}
          selectedStudioId={selectedStudioId}
          onSelectStudio={setSelectedStudioId}
          className="absolute inset-0"
        />
      </div>
    </div>
  );
}
