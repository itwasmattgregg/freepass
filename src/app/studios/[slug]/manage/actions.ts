"use server";

import { getOwnedStudio, requireUser } from "@/lib/auth";
import { getDb, newId, nowIso, type DbStudio } from "@/lib/db";
import { distanceMeters, normalizeAddress } from "@/lib/address";
import { geocodeAddress } from "@/lib/geocode";
import { findDuplicateStudios } from "@/app/studios/new/actions";

async function assertOwner(slug: string) {
  const user = await requireUser();
  if (!user) return { error: "Sign in required." as const, user: null, studio: null };
  const studio = await getOwnedStudio(slug, user.id);
  if (!studio) return { error: "Studio not found or you don’t own it." as const, user, studio: null };
  return { error: null, user, studio };
}

export async function addClass(
  slug: string,
  body: {
    name: string;
    category: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const { error, studio } = await assertOwner(slug);
  if (error || !studio) return { success: false, error: error ?? "Unauthorized" };

  try {
    const timestamp = nowIso();
    getDb()
      .prepare(
        `INSERT INTO classes (
          id, studio_id, name, category, day_of_week, start_time, end_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newId(),
        studio.id,
        body.name.trim(),
        body.category || null,
        body.day_of_week,
        body.start_time,
        body.end_time,
        timestamp,
        timestamp
      );
    return { success: true };
  } catch {
    return { success: false, error: "Could not add class." };
  }
}

export async function deleteClass(
  slug: string,
  classId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { error, studio } = await assertOwner(slug);
  if (error || !studio) return { success: false, error: error ?? "Unauthorized" };

  const result = getDb()
    .prepare(`DELETE FROM classes WHERE id = ? AND studio_id = ?`)
    .run(classId, studio.id);

  return result.changes > 0
    ? { success: true }
    : { success: false, error: "Could not delete class." };
}

export async function updateStudioProfile(
  slug: string,
  body: {
    name: string;
    description: string | null;
    address: string;
    contact_email: string;
    offers_trial: boolean;
    force_update?: boolean;
  }
): Promise<
  | { success: true; slug: string }
  | { success: false; error: string; duplicates?: { name: string; slug: string }[] }
> {
  const { error, studio } = await assertOwner(slug);
  if (error || !studio) return { success: false, error: error ?? "Unauthorized" };

  const name = body.name.trim();
  const address = body.address.trim();
  const contactEmail = body.contact_email.trim().toLowerCase();

  if (!name) return { success: false, error: "Name is required." };
  if (address.length < 8) return { success: false, error: "Enter a full address." };
  if (!contactEmail.includes("@")) return { success: false, error: "Enter a valid contact email." };

  let latitude = studio.latitude != null ? Number(studio.latitude) : null;
  let longitude = studio.longitude != null ? Number(studio.longitude) : null;

  const addressChanged = address !== (studio.address ?? "");
  if (addressChanged) {
    const geo = await geocodeAddress(address);
    if (!geo) {
      return { success: false, error: "Could not locate the new address." };
    }
    latitude = geo.latitude;
    longitude = geo.longitude;

    const duplicates = await findDuplicateStudios({
      address,
      latitude,
      longitude,
      excludeStudioId: studio.id,
    });
    if (duplicates.length > 0 && !body.force_update) {
      return {
        success: false,
        error: "Another studio is already listed at or near this address.",
        duplicates: duplicates.map((d) => ({ name: d.name, slug: d.slug })),
      };
    }
  }

  if (latitude != null && longitude != null && !body.force_update) {
    const nearby = getDb()
      .prepare(
        `SELECT id, name, slug, latitude, longitude
         FROM studios
         WHERE id != ? AND latitude IS NOT NULL
         LIMIT 50`
      )
      .all(studio.id) as Pick<DbStudio, "id" | "name" | "slug" | "latitude" | "longitude">[];

    const clash = nearby.find((s) => {
      if (s.latitude == null || s.longitude == null) return false;
      return (
        distanceMeters(latitude!, longitude!, Number(s.latitude), Number(s.longitude)) <= 80 &&
        s.name.trim().toLowerCase() === name.toLowerCase()
      );
    });
    if (clash) {
      return {
        success: false,
        error: "Another listing with this name is already at that location.",
        duplicates: [{ name: clash.name, slug: clash.slug }],
      };
    }
  }

  try {
    getDb()
      .prepare(
        `UPDATE studios
         SET name = ?, description = ?, address = ?, address_normalized = ?,
             latitude = ?, longitude = ?, contact_email = ?, offers_trial = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        name,
        body.description,
        address,
        normalizeAddress(address),
        latitude,
        longitude,
        contactEmail,
        body.offers_trial ? 1 : 0,
        nowIso(),
        studio.id
      );
    return { success: true, slug: studio.slug };
  } catch {
    return { success: false, error: "Could not update studio." };
  }
}

/** One-time claim for legacy studios that still have a management key bookmark. */
export async function claimStudioWithKey(
  slug: string,
  managementKey: string
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  if (!user) return { success: false, error: "Sign in to claim this studio." };

  const db = getDb();
  const studio = db
    .prepare(
      `SELECT id, owner_id, management_key FROM studios WHERE slug = ? AND management_key = ?`
    )
    .get(slug, managementKey) as
    | Pick<DbStudio, "id" | "owner_id" | "management_key">
    | undefined;

  if (!studio) return { success: false, error: "Invalid claim link." };
  if (studio.owner_id && studio.owner_id !== user.id) {
    return { success: false, error: "This studio already has an owner." };
  }

  try {
    db.prepare(
      `UPDATE studios SET owner_id = ?, contact_email = ?, updated_at = ? WHERE id = ?`
    ).run(user.id, user.email, nowIso(), studio.id);
    return { success: true };
  } catch {
    return { success: false, error: "Could not claim studio." };
  }
}
