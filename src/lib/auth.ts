import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

export async function requireUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getOwnedStudio(slug: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("studios")
    .select("*")
    .eq("slug", slug)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export type PublicStudio = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  offers_trial: boolean;
  contact_email: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};
