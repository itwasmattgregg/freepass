"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedStudio, requireUser } from "@/lib/auth";
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

  const admin = createAdminClient();
  const { error: insertError } = await admin.from("classes").insert({
    studio_id: studio.id,
    name: body.name.trim(),
    category: body.category || null,
    day_of_week: body.day_of_week,
    start_time: body.start_time,
    end_time: body.end_time,
  });

  return insertError
    ? { success: false, error: "Could not add class." }
    : { success: true };
}

export async function deleteClass(
  slug: string,
  classId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { error, studio } = await assertOwner(slug);
  if (error || !studio) return { success: false, error: error ?? "Unauthorized" };

  const admin = createAdminClient();
  const { error: delError } = await admin
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("studio_id", studio.id);

  return delError
    ? { success: false, error: "Could not delete class." }
    : { success: true };
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

  // Soft check: if coords exist and another studio is extremely close with same name-ish
  if (latitude != null && longitude != null && !body.force_update) {
    const admin = createAdminClient();
    const { data: nearby } = await admin
      .from("studios")
      .select("id, name, slug, latitude, longitude")
      .neq("id", studio.id)
      .not("latitude", "is", null)
      .limit(50);

    const clash = (nearby ?? []).find((s) => {
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

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("studios")
    .update({
      name,
      description: body.description,
      address,
      address_normalized: normalizeAddress(address),
      latitude,
      longitude,
      contact_email: contactEmail,
      offers_trial: body.offers_trial,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studio.id);

  if (updateError) return { success: false, error: "Could not update studio." };
  return { success: true, slug: studio.slug };
}

/** One-time claim for legacy studios that still have a management key bookmark. */
export async function claimStudioWithKey(
  slug: string,
  managementKey: string
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  if (!user) return { success: false, error: "Sign in to claim this studio." };

  const admin = createAdminClient();
  const { data: studio } = await admin
    .from("studios")
    .select("id, owner_id, management_key")
    .eq("slug", slug)
    .eq("management_key", managementKey)
    .maybeSingle();

  if (!studio) return { success: false, error: "Invalid claim link." };
  if (studio.owner_id && studio.owner_id !== user.id) {
    return { success: false, error: "This studio already has an owner." };
  }

  const { error } = await admin
    .from("studios")
    .update({
      owner_id: user.id,
      contact_email: user.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studio.id);

  return error ? { success: false, error: "Could not claim studio." } : { success: true };
}
