/** Normalize street addresses for duplicate detection. */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(street|st\.?)\b/g, "st")
    .replace(/\b(avenue|ave\.?)\b/g, "ave")
    .replace(/\b(boulevard|blvd\.?)\b/g, "blvd")
    .replace(/\b(road|rd\.?)\b/g, "rd")
    .replace(/\b(drive|dr\.?)\b/g, "dr")
    .replace(/\b(lane|ln\.?)\b/g, "ln")
    .replace(/\b(suite|ste\.?|unit|apt\.?|#)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rough distance in meters between two WGS84 points (Haversine). */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
