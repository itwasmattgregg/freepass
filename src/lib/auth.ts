import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import {
  getDb,
  isNextBuildPhase,
  newId,
  nowIso,
  type DbStudio,
  type DbUser,
} from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";

export type AuthUser = {
  id: string;
  email: string;
};

const SESSION_COOKIE = "freepass_session";
const SESSION_DAYS = 30;
const MAGIC_LINK_MINUTES = 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function cookieSecure() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isNextBuildPhase()) return null;

  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(hashToken(raw), nowIso()) as AuthUser | undefined;

  return row ?? null;
}

export async function requireUser(): Promise<AuthUser | null> {
  return getCurrentUser();
}

export async function getOwnedStudio(
  slug: string,
  userId: string
): Promise<DbStudio | null> {
  const db = getDb();
  const studio = db
    .prepare(`SELECT * FROM studios WHERE slug = ? AND owner_id = ?`)
    .get(slug, userId) as DbStudio | undefined;
  return studio ?? null;
}

export async function requestMagicLinkForEmail(
  email: string,
  nextPath: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const db = getDb();

  let user = db
    .prepare(`SELECT id, email, created_at FROM users WHERE email = ?`)
    .get(normalized) as DbUser | undefined;

  if (!user) {
    const id = newId();
    db.prepare(`INSERT INTO users (id, email) VALUES (?, ?)`).run(id, normalized);
    user = { id, email: normalized, created_at: nowIso() };
  }

  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000).toISOString();
  const safeNext = nextPath.startsWith("/") ? nextPath : "/studios/new";

  db.prepare(
    `INSERT INTO magic_link_tokens (id, user_id, token_hash, next_path, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(newId(), user.id, hashToken(token), safeNext, expires);

  const url = `${appOrigin()}/auth/callback?token=${encodeURIComponent(token)}&next=${encodeURIComponent(safeNext)}`;
  await sendMagicLinkEmail({ to: normalized, url });
}

export async function consumeMagicLink(
  token: string
): Promise<{ user: AuthUser; nextPath: string } | null> {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT t.id, t.user_id, t.next_path, t.expires_at, t.consumed_at, u.email
       FROM magic_link_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ?`
    )
    .get(hashToken(token)) as
    | {
        id: string;
        user_id: string;
        next_path: string;
        expires_at: string;
        consumed_at: string | null;
        email: string;
      }
    | undefined;

  if (!row || row.consumed_at || row.expires_at <= nowIso()) return null;

  db.prepare(`UPDATE magic_link_tokens SET consumed_at = ? WHERE id = ?`).run(
    nowIso(),
    row.id
  );

  return {
    user: { id: row.user_id, email: row.email },
    nextPath: row.next_path.startsWith("/") ? row.next_path : "/studios/new",
  };
}

export type SessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    expires: Date;
  };
};

/** Insert a session row and return the cookie to attach to the response. */
export function issueSessionCookie(userId: string): SessionCookie {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const db = getDb();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  ).run(newId(), userId, hashToken(token), expires.toISOString());

  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(),
      path: "/",
      expires,
    },
  };
}

export async function createSession(userId: string): Promise<void> {
  const cookie = issueSessionCookie(userId);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.options);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (raw) {
    getDb()
      .prepare(`DELETE FROM sessions WHERE token_hash = ?`)
      .run(hashToken(raw));
  }
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 0,
  });
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
