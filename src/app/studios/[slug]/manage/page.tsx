import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, studioOffersTrial, type DbClass, type DbStudio } from "@/lib/db";
import { claimStudioWithKey } from "./actions";
import { ManageStudioPanel } from "./ManageSchedule";

export const dynamic = "force-dynamic";

export default async function ManageStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string; new?: string }>;
}) {
  const { slug } = await params;
  const { key: managementKey, new: isNew } = await searchParams;

  const user = await getCurrentUser();

  if (!user) {
    const next = managementKey
      ? `/studios/${slug}/manage?key=${encodeURIComponent(managementKey)}`
      : `/studios/${slug}/manage`;
    redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  }

  if (managementKey) {
    const claimed = await claimStudioWithKey(slug, managementKey);
    if (!claimed.success) {
      return (
        <main className="mx-auto max-w-lg px-4 py-12">
          <h1 className="text-xl font-semibold text-stone-900">Couldn’t claim studio</h1>
          <p className="mt-2 text-stone-600">{claimed.error}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-stone-500 underline">
            Back home
          </Link>
        </main>
      );
    }
    redirect(`/studios/${slug}/manage?new=${isNew === "1" ? "1" : "0"}`);
  }

  const db = getDb();
  const studio = db
    .prepare(
      `SELECT id, name, slug, description, address, contact_email, offers_trial, owner_id
       FROM studios
       WHERE slug = ? AND owner_id = ?`
    )
    .get(slug, user.id) as
    | Pick<
        DbStudio,
        | "id"
        | "name"
        | "slug"
        | "description"
        | "address"
        | "contact_email"
        | "offers_trial"
        | "owner_id"
      >
    | undefined;

  if (!studio) notFound();

  const classes = db
    .prepare(
      `SELECT id, name, category, day_of_week, start_time, end_time
       FROM classes
       WHERE studio_id = ?
       ORDER BY day_of_week, start_time`
    )
    .all(studio.id) as Pick<
    DbClass,
    "id" | "name" | "category" | "day_of_week" | "start_time" | "end_time"
  >[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href={`/studios/${slug}`}
        className="mb-6 inline-block text-sm text-stone-500 hover:text-stone-700"
      >
        ← Back to {studio.name}
      </Link>

      <h1 className="text-2xl font-bold text-stone-900">Manage studio</h1>
      <p className="mt-1 text-stone-600">{studio.name}</p>

      <div className="mt-8">
        <ManageStudioPanel
          slug={slug}
          studio={{
            name: studio.name,
            description: studio.description,
            address: studio.address,
            contact_email: studio.contact_email,
            offers_trial: studioOffersTrial(studio),
          }}
          classes={classes}
          isNew={isNew === "1"}
        />
      </div>
    </main>
  );
}
