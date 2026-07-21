"use server";

import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type Bounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type DiscoverFilters = {
  query?: string;
  category?: string;
  trialOnly?: boolean;
  dayOfWeek?: number;
};

export type StudioWithClasses = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  offers_trial: boolean;
  classes: {
    id: string;
    name: string;
    category: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[];
};

const STUDIO_SELECT = `
  id,
  name,
  slug,
  description,
  address,
  latitude,
  longitude,
  offers_trial,
  classes (
    id,
    name,
    category,
    day_of_week,
    start_time,
    end_time
  )
`;

function applyClientFilters(
  studios: StudioWithClasses[],
  filters: DiscoverFilters
): StudioWithClasses[] {
  let result = studios;

  if (filters.category?.trim()) {
    const cat = filters.category.trim().toLowerCase();
    result = result.filter((s) =>
      s.classes?.some((c) => c.category?.toLowerCase() === cat)
    );
  }

  if (filters.dayOfWeek !== undefined && filters.dayOfWeek !== null) {
    result = result.filter((s) =>
      s.classes?.some((c) => c.day_of_week === filters.dayOfWeek)
    );
  }

  return result;
}

export async function getStudiosInBounds(
  bounds: Bounds,
  filters: DiscoverFilters = {}
): Promise<StudioWithClasses[]> {
  if (!hasSupabaseEnv()) return [];

  try {
    const supabase = await createClient();

    let query = supabase
      .from("studios")
      .select(STUDIO_SELECT)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("latitude", bounds.south)
      .lte("latitude", bounds.north)
      .gte("longitude", bounds.west)
      .lte("longitude", bounds.east);

    if (filters.trialOnly) {
      query = query.eq("offers_trial", true);
    }

    if (filters.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%`
      );
    }

    const { data: studios, error } = await query.order("name");
    if (error) {
      console.error("discover_bounds_failed", error);
      return [];
    }

    return applyClientFilters((studios ?? []) as StudioWithClasses[], filters);
  } catch (e) {
    console.error("discover_bounds_failed", e);
    return [];
  }
}

export async function getAllStudiosForDiscovery(
  filters: DiscoverFilters = {}
): Promise<StudioWithClasses[]> {
  if (!hasSupabaseEnv()) return [];

  try {
    const supabase = await createClient();

    let query = supabase.from("studios").select(STUDIO_SELECT).order("name");

    if (filters.trialOnly) {
      query = query.eq("offers_trial", true);
    }

    if (filters.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%`
      );
    }

    const { data: studios, error } = await query;
    if (error) {
      console.error("discover_all_failed", error);
      return [];
    }

    return applyClientFilters((studios ?? []) as StudioWithClasses[], filters);
  } catch (e) {
    console.error("discover_all_failed", e);
    return [];
  }
}
