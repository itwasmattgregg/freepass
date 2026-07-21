"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();

  const { data: studio } = await admin
    .from("studios")
    .select("id, name, slug, offers_trial, contact_email")
    .eq("id", studioId)
    .maybeSingle();

  if (!studio || !studio.offers_trial) {
    return { success: false, error: "This studio is not offering free trials." };
  }

  // One trial per email per studio (DB unique index is the source of truth)
  const { data: existing } = await admin
    .from("trial_signups")
    .select("id")
    .eq("studio_id", studioId)
    .eq("email", normalized)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: "This email has already been used for a free trial at this studio.",
    };
  }

  const { error } = await admin.from("trial_signups").insert({
    studio_id: studioId,
    email: normalized,
  });

  if (error) {
    if (error.code === "23505") {
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
