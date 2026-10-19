"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getDb, isUniqueConstraintError, newId, nowIso, type DbStudio } from "@/lib/db";
import { distanceMeters, normalizeAddress, slugify } from "@/lib/address";
import { geocodeAddress } from "@/lib/geocode";
import { checkRateLimit } from "@/lib/rate-limit";

export type DuplicateStudio = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  reason: "address" | "nearby";
};

export type CreateStudioResult =
  | { success: true; slug: string }
  | {
      success: false;
      error: string;
      field?: string;
      duplicates?: DuplicateStudio[];
      geocoded?: { latitude: number; longitude: number; displayName: string };
    };

export async function geocodeStudioAddress(address: string): Promise<{
  ok: boolean;
  error?: string;
  result?: { latitude: number; longitude: number; displayName: string };
  duplicates?: DuplicateStudio[];
}> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const trimmed = address.trim();
  if (trimmed.length < 8) {
    return { ok: false, error: "Enter a full street address so we can place you on the map." };
  }

  const result = await geocodeAddress(trimmed);
  if (!result) {
    return {
      ok: false,
      error: "We couldn’t find that address. Check the spelling or add city and state.",
    };
  }

  const duplicates = await findDuplicateStudios({
    address: trimmed,
    latitude: result.latitude,
    longitude: result.longitude,
  });

  return { ok: true, result, duplicates };
}

export async function findDuplicateStudios(input: {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  excludeStudioId?: string;
}): Promise<DuplicateStudio[]> {
  const db = getDb();
  const normalized = normalizeAddress(input.address);
  const found = new Map<string, DuplicateStudio>();

  if (normalized) {
    const rows = db
      .prepare(
        `SELECT id, name, slug, address
         FROM studios
         WHERE address_normalized = ?
         LIMIT 5`
      )
      .all(normalized) as Pick<DbStudio, "id" | "name" | "slug" | "address">[];

    for (const s of rows) {
      if (input.excludeStudioId && s.id === input.excludeStudioId) continue;
      found.set(s.id, { ...s, reason: "address" });
    }
  }

  if (
    input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    const delta = 0.002;
    const rows = db
      .prepare(
        `SELECT id, name, slug, address, latitude, longitude
         FROM studios
         WHERE latitude IS NOT NULL
           AND longitude IS NOT NULL
           AND latitude >= ? AND latitude <= ?
           AND longitude >= ? AND longitude <= ?
         LIMIT 20`
      )
      .all(
        input.latitude - delta,
        input.latitude + delta,
        input.longitude - delta,
        input.longitude + delta
      ) as Pick<
      DbStudio,
      "id" | "name" | "slug" | "address" | "latitude" | "longitude"
    >[];

    for (const s of rows) {
      if (input.excludeStudioId && s.id === input.excludeStudioId) continue;
      if (s.latitude == null || s.longitude == null) continue;
      const meters = distanceMeters(
        input.latitude,
        input.longitude,
        Number(s.latitude),
        Number(s.longitude)
      );
      if (meters <= 80) {
        found.set(s.id, {
          id: s.id,
          name: s.name,
          slug: s.slug,
          address: s.address,
          reason: found.get(s.id)?.reason === "address" ? "address" : "nearby",
        });
      }
    }
  }

  return [...found.values()];
}

export async function createStudio(formData: FormData): Promise<CreateStudioResult> {
  const user = await requireUser();
  if (!user?.email) {
    return { success: false, error: "Sign in to list your studio.", field: "auth" };
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const allowed = await checkRateLimit("create_studio", `${user.id}:${ip}`, 5, 60 * 60);
  if (!allowed) {
    return { success: false, error: "Too many studios created recently. Try again later." };
  }

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || "";
  const contactEmail =
    ((formData.get("contact_email") as string)?.trim().toLowerCase() || user.email).trim();
  const offersTrial = formData.get("offers_trial") === "on";
  const forceCreate = formData.get("force_create") === "1";
  const latRaw = formData.get("latitude") as string | null;
  const lngRaw = formData.get("longitude") as string | null;
  let latitude = latRaw ? Number(latRaw) : null;
  let longitude = lngRaw ? Number(lngRaw) : null;

  if (!name || name.length < 2) {
    return { success: false, error: "Studio name is required.", field: "name" };
  }
  if (!address || address.length < 8) {
    return {
      success: false,
      error: "A full address is required so people can find you on the map.",
      field: "address",
    };
  }
  if (!contactEmail.includes("@")) {
    return { success: false, error: "Enter a valid contact email.", field: "contact_email" };
  }

  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const geo = await geocodeAddress(address);
    if (!geo) {
      return {
        success: false,
        error: "We couldn’t locate that address. Confirm it, then try Find on map.",
        field: "address",
      };
    }
    latitude = geo.latitude;
    longitude = geo.longitude;
  }

  const duplicates = await findDuplicateStudios({ address, latitude, longitude });
  if (duplicates.length > 0 && !forceCreate) {
    return {
      success: false,
      error:
        "A studio may already be listed at this address. Claim the existing listing or confirm this is a different space.",
      field: "address",
      duplicates,
      geocoded: {
        latitude,
        longitude,
        displayName: address,
      },
    };
  }

  const db = getDb();
  let slug = slugify(name) || "studio";
  const existing = db.prepare(`SELECT id FROM studios WHERE slug = ?`).get(slug);
  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const id = newId();
    const timestamp = nowIso();
    db.prepare(
      `INSERT INTO studios (
        id, name, slug, description, address, address_normalized,
        latitude, longitude, offers_trial, management_key, owner_id, contact_email,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      name,
      slug,
      description,
      address,
      normalizeAddress(address),
      latitude,
      longitude,
      offersTrial ? 1 : 0,
      newId(),
      user.id,
      contactEmail,
      timestamp,
      timestamp
    );

    return { success: true, slug };
  } catch (error) {
    console.error("create_studio_failed", error);
    if (isUniqueConstraintError(error)) {
      return { success: false, error: "A studio with a similar name already exists.", field: "name" };
    }
    return { success: false, error: "Could not create studio. Please try again." };
  }
}
