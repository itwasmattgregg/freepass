export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

/**
 * Geocode via OpenStreetMap Nominatim (no API key).
 * Respect their usage policy: identify the app and keep request volume low.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: "json",
    limit: "1",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "FreePass/1.0 (studio discovery; https://github.com/freepass)",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const hit = data[0];
  if (!hit) return null;

  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    displayName: hit.display_name,
  };
}
