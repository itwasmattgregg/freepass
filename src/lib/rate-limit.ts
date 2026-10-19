import { getDb, newId, nowIso } from "@/lib/db";

/** Sliding-window rate limit backed by SQLite. Returns false when over limit. */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const db = getDb();
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const row = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM rate_limits
         WHERE bucket = ? AND identifier = ? AND created_at >= ?`
      )
      .get(bucket, identifier, since) as { count: number };

    if (row.count >= limit) return false;

    db.prepare(
      `INSERT INTO rate_limits (id, bucket, identifier, created_at) VALUES (?, ?, ?, ?)`
    ).run(newId(), bucket, identifier, nowIso());

    return true;
  } catch (error) {
    console.error("rate_limit_check_failed", error);
    return true; // fail open so legitimate users aren't blocked by infra blips
  }
}

/** Best-effort cleanup of old rate-limit rows. */
export async function pruneRateLimits(olderThanHours = 24) {
  const db = getDb();
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
  db.prepare(`DELETE FROM rate_limits WHERE created_at < ?`).run(cutoff);
}
