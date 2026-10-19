import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  next_path TEXT NOT NULL DEFAULT '/studios/new',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS studios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  address TEXT,
  address_normalized TEXT,
  latitude REAL,
  longitude REAL,
  offers_trial INTEGER NOT NULL DEFAULT 1,
  management_key TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  contact_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trial_signups (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  signed_up_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_studios_location ON studios(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_studios_owner_id ON studios(owner_id);
CREATE INDEX IF NOT EXISTS idx_studios_address_normalized ON studios(address_normalized);
CREATE INDEX IF NOT EXISTS idx_classes_studio_id ON classes(studio_id);
CREATE INDEX IF NOT EXISTS idx_classes_category ON classes(category);
CREATE INDEX IF NOT EXISTS idx_trial_signups_studio_id ON trial_signups(studio_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_signups_studio_email
  ON trial_signups(studio_id, email);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(bucket, identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_user_id ON magic_link_tokens(user_id);
`;

export type DbUser = {
  id: string;
  email: string;
  created_at: string;
};

export type DbStudio = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  address_normalized: string | null;
  latitude: number | null;
  longitude: number | null;
  offers_trial: number;
  management_key: string;
  owner_id: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
};

export type DbClass = {
  id: string;
  studio_id: string;
  name: string;
  description: string | null;
  category: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
};

type SqliteDatabase = Database.Database;

declare global {
  var __freepassDb: SqliteDatabase | undefined;
}

function databasePath() {
  return (
    process.env.DATABASE_PATH ||
    path.join(process.cwd(), "data", "freepass.db")
  );
}

/** Avoid loading the native addon during `next build` static workers (can SIGSEGV). */
export function isNextBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function getDb(): SqliteDatabase {
  if (global.__freepassDb) return global.__freepassDb;

  if (isNextBuildPhase()) {
    throw new Error("SQLite is not available during the Next.js build phase");
  }

  // Lazy-require so importing this module during SSG doesn't load the native addon.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DatabaseConstructor = require("better-sqlite3") as typeof Database;

  const dbPath = databasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseConstructor(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  global.__freepassDb = db;
  return db;
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

export function studioOffersTrial(studio: Pick<DbStudio, "offers_trial">) {
  return Boolean(studio.offers_trial);
}
