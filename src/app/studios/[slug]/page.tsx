import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, studioOffersTrial, type DbClass, type DbStudio } from "@/lib/db";
import { DAY_NAMES } from "@/types/database";
import { TrialSignupForm } from "./TrialSignupForm";

export const dynamic = "force-dynamic";

function formatTime(t: string) {
  return new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function StudioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();

  const studio = db
    .prepare(
      `SELECT id, name, slug, description, address, latitude, longitude, offers_trial, owner_id
       FROM studios WHERE slug = ?`
    )
    .get(slug) as
    | Pick<
        DbStudio,
        | "id"
        | "name"
        | "slug"
        | "description"
        | "address"
        | "latitude"
        | "longitude"
        | "offers_trial"
        | "owner_id"
      >
    | undefined;

  if (!studio) notFound();

  const user = await getCurrentUser();
  const isOwner = !!(user && studio.owner_id && user.id === studio.owner_id);

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

  const scheduleByDay = classes.reduce<Record<number, typeof classes>>((acc, c) => {
    if (!acc[c.day_of_week]) acc[c.day_of_week] = [];
    acc[c.day_of_week].push(c);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-stone-500 hover:text-stone-700">
        ← Back to discover
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">{studio.name}</h1>
        {studio.description && (
          <p className="mt-2 text-stone-600">{studio.description}</p>
        )}
        {studio.address && (
          <p className="mt-1 text-sm text-stone-500">{studio.address}</p>
        )}
        {isOwner ? (
          <Link
            href={`/studios/${studio.slug}/manage`}
            className="mt-3 inline-block text-sm font-medium text-stone-800 underline hover:no-underline"
          >
            Manage your studio
          </Link>
        ) : (
          <Link
            href={`/auth/login?next=${encodeURIComponent(`/studios/${studio.slug}/manage`)}`}
            className="mt-3 inline-block text-sm text-stone-500 hover:text-stone-700"
          >
            Studio owner? Sign in to manage
          </Link>
        )}
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-stone-900">Class schedule</h2>
        {classes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-6 text-center text-stone-500">
            No classes listed yet.
            {isOwner && (
              <>
                {" "}
                <Link
                  href={`/studios/${studio.slug}/manage`}
                  className="text-stone-700 underline"
                >
                  Add schedule
                </Link>
              </>
            )}
          </p>
        ) : (
          <ul className="space-y-4">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const dayClasses = scheduleByDay[day] ?? [];
              if (dayClasses.length === 0) return null;
              return (
                <li key={day} className="rounded-xl border border-stone-200 bg-white p-4">
                  <h3 className="font-medium text-stone-900">{DAY_NAMES[day]}</h3>
                  <ul className="mt-2 space-y-1">
                    {dayClasses.map((c) => (
                      <li key={c.id} className="flex items-baseline justify-between text-sm">
                        <span className="font-medium text-stone-800">
                          {c.category ? `${c.category} · ` : ""}
                          {c.name}
                        </span>
                        <span className="text-stone-500">
                          {formatTime(c.start_time)} – {formatTime(c.end_time)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {studioOffersTrial(studio) && (
        <section className="rounded-xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="mb-2 text-xl font-semibold text-stone-900">Free trial class</h2>
          <p className="mb-4 text-sm text-stone-600">
            Sign up with your email. Each email can claim one free trial at this studio.
          </p>
          <TrialSignupForm studioId={studio.id} />
        </section>
      )}
    </main>
  );
}
