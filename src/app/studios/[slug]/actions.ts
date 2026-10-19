"use server";

import { headers } from "next/headers";
import { getDb, isUniqueConstraintError, newId, nowIso, studioOffersTrial, type DbStudio } from "@/lib/db";
import { sendTrialSignupEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export async function signUpForTrial(
  studioId: string,
  email: string
): Promise<{ success: true } | { success: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { success: false, error: "Please enter a valid email." };
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const emailAllowed = await checkRateLimit("trial_email", normalized, 3, 60 * 60);
  if (!emailAllowed) {
    return {
      success: false,
      error: "This email has reached the signup limit for now. Try again later.",
    };
  }

  const ipAllowed = await checkRateLimit("trial_ip", ip, 20, 60 * 60);
  if (!ipAllowed) {
    return { success: false, error: "Too many signup attempts. Try again later." };
  }

  const db = getDb();
  const studio = db
    .prepare(
      `SELECT id, name, slug, offers_trial, contact_email FROM studios WHERE id = ?`
    )
    .get(studioId) as
    | Pick<DbStudio, "id" | "name" | "slug" | "offers_trial" | "contact_email">
    | undefined;

  if (!studio || !studioOffersTrial(studio)) {
    return { success: false, error: "This studio is not offering free trials." };
  }

  const existing = db
    .prepare(`SELECT id FROM trial_signups WHERE studio_id = ? AND email = ?`)
    .get(studioId, normalized);

  if (existing) {
    return {
      success: false,
      error: "This email has already been used for a free trial at this studio.",
    };
  }

  try {
    db.prepare(
      `INSERT INTO trial_signups (id, studio_id, email, signed_up_at) VALUES (?, ?, ?, ?)`
    ).run(newId(), studioId, normalized, nowIso());
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "This email has already been used for a free trial at this studio.",
      };
    }
    console.error("trial_signup_failed", error);
    return { success: false, error: "Could not sign up. Please try again." };
  }

  if (studio.contact_email) {
    await sendTrialSignupEmail({
      to: studio.contact_email,
      studioName: studio.name,
      trialEmail: normalized,
      studioSlug: studio.slug,
    });
  }

  return { success: true };
}
