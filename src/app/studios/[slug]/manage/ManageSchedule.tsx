"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CLASS_CATEGORIES, DAY_NAMES } from "@/types/database";
import {
  addClass,
  deleteClass,
  updateStudioProfile,
} from "./actions";

const DAY_OPTIONS = DAY_NAMES.map((label, value) => ({ value, label }));

function formatTime(t: string) {
  return new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type ClassRow = {
  id: string;
  name: string;
  category: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type StudioProfile = {
  name: string;
  description: string | null;
  address: string | null;
  contact_email: string | null;
  offers_trial: boolean;
};

export function ManageStudioPanel({
  slug,
  studio,
  classes,
  isNew,
}: {
  slug: string;
  studio: StudioProfile;
  classes: ClassRow[];
  isNew?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [day, setDay] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [classStatus, setClassStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [classError, setClassError] = useState("");

  const [profileName, setProfileName] = useState(studio.name);
  const [profileDescription, setProfileDescription] = useState(studio.description ?? "");
  const [profileAddress, setProfileAddress] = useState(studio.address ?? "");
  const [profileEmail, setProfileEmail] = useState(studio.contact_email ?? "");
  const [offersTrial, setOffersTrial] = useState(studio.offers_trial);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [profileMessage, setProfileMessage] = useState("");
  const [dupes, setDupes] = useState<{ name: string; slug: string }[]>([]);

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    setClassStatus("loading");
    setClassError("");
    const result = await addClass(slug, {
      name: name.trim(),
      category: category.trim() || null,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
    });
    if (result.success) {
      setClassStatus("success");
      setName("");
      setCategory("");
      setStartTime("09:00");
      setEndTime("10:00");
      router.refresh();
    } else {
      setClassStatus("error");
      setClassError(result.error);
    }
  }

  async function handleDelete(classId: string) {
    if (!confirm("Remove this class from your schedule?")) return;
    const result = await deleteClass(slug, classId);
    if (result.success) router.refresh();
    else alert(result.error);
  }

  async function handleProfileSave(force = false) {
    setProfileStatus("loading");
    setProfileMessage("");
    setDupes([]);
    const result = await updateStudioProfile(slug, {
      name: profileName,
      description: profileDescription.trim() || null,
      address: profileAddress,
      contact_email: profileEmail,
      offers_trial: offersTrial,
      force_update: force,
    });
    if (result.success) {
      setProfileStatus("success");
      setProfileMessage("Profile saved.");
      router.refresh();
    } else {
      setProfileStatus("error");
      setProfileMessage(result.error);
      if (result.duplicates) setDupes(result.duplicates);
    }
  }

  const scheduleByDay = classes.reduce<Record<number, ClassRow[]>>((acc, c) => {
    if (!acc[c.day_of_week]) acc[c.day_of_week] = [];
    acc[c.day_of_week].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      {isNew && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Studio created. Add your weekly classes below. You’re signed in — bookmark Discover and come back via{" "}
          <span className="font-medium">Manage</span> anytime.
        </p>
      )}

      <section className="rounded-xl border border-stone-200 bg-stone-50 p-5">
        <h2 className="font-medium text-stone-900">Studio profile</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Name</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Description</label>
            <textarea
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Address</label>
            <input
              value={profileAddress}
              onChange={(e) => setProfileAddress(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Trial notification email
            </label>
            <input
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={offersTrial}
              onChange={(e) => setOffersTrial(e.target.checked)}
              className="rounded border-stone-300"
            />
            Offer free trial
          </label>
          {profileMessage && (
            <p
              className={`text-sm ${
                profileStatus === "success" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {profileMessage}
            </p>
          )}
          {dupes.length > 0 && (
            <ul className="text-sm text-amber-800">
              {dupes.map((d) => (
                <li key={d.slug}>
                  <Link href={`/studios/${d.slug}`} className="underline">
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={profileStatus === "loading"}
              onClick={() => handleProfileSave(false)}
              className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
            >
              {profileStatus === "loading" ? "Saving…" : "Save profile"}
            </button>
            {dupes.length > 0 && (
              <button
                type="button"
                disabled={profileStatus === "loading"}
                onClick={() => handleProfileSave(true)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800"
              >
                Save anyway
              </button>
            )}
          </div>
        </div>
      </section>

      <form
        onSubmit={handleAddClass}
        className="rounded-xl border border-stone-200 bg-stone-50 p-5"
      >
        <h2 className="mb-4 font-medium text-stone-900">Add a class</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="class-name" className="mb-1 block text-sm font-medium text-stone-700">
              Class name
            </label>
            <input
              id="class-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Flow"
              required
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-stone-700">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            >
              <option value="">Optional</option>
              {CLASS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="day" className="mb-1 block text-sm font-medium text-stone-700">
              Day
            </label>
            <select
              id="day"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="start-time" className="mb-1 block text-sm font-medium text-stone-700">
              Start
            </label>
            <input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label htmlFor="end-time" className="mb-1 block text-sm font-medium text-stone-700">
              End
            </label>
            <input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
        </div>
        {classStatus === "success" && (
          <p className="mt-3 text-sm text-emerald-600">Class added.</p>
        )}
        {classStatus === "error" && (
          <p className="mt-3 text-sm text-red-600">{classError || "Could not add class."}</p>
        )}
        <button
          type="submit"
          disabled={classStatus === "loading"}
          className="mt-4 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {classStatus === "loading" ? "Adding…" : "Add class"}
        </button>
      </form>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Current schedule</h2>
        {classes.length === 0 ? (
          <p className="text-stone-500">No classes yet. Add one above.</p>
        ) : (
          <ul className="space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const dayClasses = scheduleByDay[d] ?? [];
              if (dayClasses.length === 0) return null;
              return (
                <li key={d} className="rounded-lg border border-stone-200 bg-white p-3">
                  <h3 className="font-medium text-stone-800">{DAY_NAMES[d]}</h3>
                  <ul className="mt-2 space-y-2">
                    {dayClasses.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 text-sm text-stone-600"
                      >
                        <span>
                          {c.category ? `${c.category} · ` : ""}
                          {c.name} — {formatTime(c.start_time)}–{formatTime(c.end_time)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
