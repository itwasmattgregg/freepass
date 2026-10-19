"use server";

import { getDb, studioOffersTrial, type DbClass, type DbStudio } from "@/lib/db";

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

type StudioRow = Pick<
  DbStudio,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "address"
  | "latitude"
  | "longitude"
  | "offers_trial"
>;

type ClassRow = Pick<
  DbClass,
  "id" | "studio_id" | "name" | "category" | "day_of_week" | "start_time" | "end_time"
>;

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

function attachClasses(studios: StudioRow[]): StudioWithClasses[] {
  if (studios.length === 0) return [];

  const db = getDb();
  const placeholders = studios.map(() => "?").join(", ");
  const classes = db
    .prepare(
      `SELECT id, studio_id, name, category, day_of_week, start_time, end_time
       FROM classes
       WHERE studio_id IN (${placeholders})
       ORDER BY day_of_week, start_time`
    )
    .all(...studios.map((s) => s.id)) as ClassRow[];

  const byStudio = new Map<string, ClassRow[]>();
  for (const c of classes) {
    const list = byStudio.get(c.studio_id) ?? [];
    list.push(c);
    byStudio.set(c.studio_id, list);
  }

  return studios.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    offers_trial: studioOffersTrial(s),
    classes: (byStudio.get(s.id) ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      day_of_week: c.day_of_week,
      start_time: c.start_time,
      end_time: c.end_time,
    })),
  }));
}

export async function getStudiosInBounds(
  bounds: Bounds,
  filters: DiscoverFilters = {}
): Promise<StudioWithClasses[]> {
  try {
    const db = getDb();
    const params: unknown[] = [
      bounds.south,
      bounds.north,
      bounds.west,
      bounds.east,
    ];
    let sql = `
      SELECT id, name, slug, description, address, latitude, longitude, offers_trial
      FROM studios
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND latitude >= ? AND latitude <= ?
        AND longitude >= ? AND longitude <= ?
    `;

    if (filters.trialOnly) {
      sql += ` AND offers_trial = 1`;
    }

    if (filters.query?.trim()) {
      const q = `%${filters.query.trim().toLowerCase()}%`;
      sql += ` AND (
        lower(name) LIKE ?
        OR lower(coalesce(description, '')) LIKE ?
        OR lower(coalesce(address, '')) LIKE ?
      )`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY name`;
    const studios = db.prepare(sql).all(...params) as StudioRow[];
    return applyClientFilters(attachClasses(studios), filters);
  } catch (e) {
    console.error("discover_bounds_failed", e);
    return [];
  }
}

export async function getAllStudiosForDiscovery(
  filters: DiscoverFilters = {}
): Promise<StudioWithClasses[]> {
  try {
    const db = getDb();
    const params: unknown[] = [];
    let sql = `
      SELECT id, name, slug, description, address, latitude, longitude, offers_trial
      FROM studios
      WHERE 1 = 1
    `;

    if (filters.trialOnly) {
      sql += ` AND offers_trial = 1`;
    }

    if (filters.query?.trim()) {
      const q = `%${filters.query.trim().toLowerCase()}%`;
      sql += ` AND (
        lower(name) LIKE ?
        OR lower(coalesce(description, '')) LIKE ?
        OR lower(coalesce(address, '')) LIKE ?
      )`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY name`;
    const studios = db.prepare(sql).all(...params) as StudioRow[];
    return applyClientFilters(attachClasses(studios), filters);
  } catch (e) {
    console.error("discover_all_failed", e);
    return [];
  }
}
