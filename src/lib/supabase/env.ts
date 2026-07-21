/** Prefer new Supabase key names; fall back to legacy anon / service_role. */

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Publishable key (sb_publishable_…) or legacy anon JWT. Safe for the browser. */
export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Secret key (sb_secret_…) or legacy service_role JWT.
 * Server-only — never expose to the browser.
 */
export function getSupabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function hasSupabaseEnv() {
  return !!(getSupabaseUrl() && getSupabasePublishableKey());
}

export function hasSupabaseAdminEnv() {
  return !!(getSupabaseUrl() && getSupabaseSecretKey());
}
