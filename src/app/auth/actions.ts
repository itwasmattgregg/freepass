"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { destroySession, requestMagicLinkForEmail } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function requestMagicLink(
  _prev: { error?: string; sent?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; sent?: boolean }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const next = (formData.get("next") as string)?.trim() || "/studios/new";

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const allowed = await checkRateLimit("magic_link", `${ip}:${email}`, 5, 60 * 15);
  if (!allowed) {
    return { error: "Too many login attempts. Try again in a few minutes." };
  }

  try {
    await requestMagicLinkForEmail(email, next.startsWith("/") ? next : "/studios/new");
  } catch (error) {
    console.error("magic_link_failed", error);
    return { error: "Could not send login link. Please try again." };
  }

  return { sent: true };
}

export async function signOut() {
  await destroySession();
  redirect("/");
}
