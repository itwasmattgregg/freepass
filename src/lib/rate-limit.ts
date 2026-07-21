import { createAdminClient } from "@/lib/supabase/admin";

/** Sliding-window rate limit backed by Postgres. Returns false when over limit. */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await admin
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("identifier", identifier)
    .gte("created_at", since);

  if (error) {
    console.error("rate_limit_check_failed", error);
    return true; // fail open so legitimate users aren't blocked by infra blips
  }

  if ((count ?? 0) >= limit) return false;

  await admin.from("rate_limits").insert({ bucket, identifier });
  return true;
}

/** Best-effort cleanup of old rate-limit rows. */
export async function pruneRateLimits(olderThanHours = 24) {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
  await admin.from("rate_limits").delete().lt("created_at", cutoff);
}
