"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createStudio,
  geocodeStudioAddress,
  type DuplicateStudio,
} from "./actions";

type Coords = { latitude: number; longitude: number; displayName: string };

export function AddStudioForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState(defaultEmail);
  const [offersTrial, setOffersTrial] = useState(true);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateStudio[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [stepHint, setStepHint] = useState<string | null>(null);

  async function handleFindOnMap() {
    setGeoError(null);
    setDuplicates([]);
    setGeocoding(true);
    try {
      const res = await geocodeStudioAddress(address);
      if (!res.ok || !res.result) {
        setCoords(null);
        setGeoError(res.error ?? "Could not find that address.");
        return;
      }
      setCoords(res.result);
      setDuplicates(res.duplicates ?? []);
      setStepHint("Location found. Review the pin details, then create your listing.");
    } finally {
      setGeocoding(false);
    }
  }

  function submit(forceCreate: boolean) {
    setFormError(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    fd.set("address", address);
    fd.set("contact_email", contactEmail);
    if (offersTrial) fd.set("offers_trial", "on");
    if (coords) {
      fd.set("latitude", String(coords.latitude));
      fd.set("longitude", String(coords.longitude));
    }
    if (forceCreate) fd.set("force_create", "1");

    startTransition(async () => {
      const result = await createStudio(fd);
      if (result.success) {
        router.push(`/studios/${result.slug}/manage?new=1`);
        return;
      }
      setFormError(result.error);
      if (result.duplicates) setDuplicates(result.duplicates);
      if (result.geocoded) setCoords(result.geocoded);
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <ol className="flex flex-wrap gap-2 text-xs font-medium text-stone-500">
        <li className="rounded-full bg-stone-100 px-3 py-1 text-stone-800">1. Details</li>
        <li className="rounded-full bg-stone-100 px-3 py-1 text-stone-800">2. Locate on map</li>
        <li className="rounded-full bg-stone-100 px-3 py-1 text-stone-800">3. Create</li>
      </ol>

      {formError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>
      )}
      {stepHint && !formError && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{stepHint}</p>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">
            Studio name *
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Sunrise Yoga"
            className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-stone-700">
            Short description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What kind of classes do you offer?"
            className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>

        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-stone-700">
            Street address *
          </label>
          <input
            id="address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setCoords(null);
              setDuplicates([]);
              setStepHint(null);
            }}
            required
            placeholder="123 Main St, City, State ZIP"
            className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFindOnMap}
              disabled={geocoding || address.trim().length < 8}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
            >
              {geocoding ? "Finding…" : "Find on map"}
            </button>
            {coords && (
              <span className="text-xs text-emerald-700">
                Located · {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </span>
            )}
          </div>
          {geoError && <p className="mt-2 text-sm text-red-600">{geoError}</p>}
          {coords && (
            <p className="mt-2 text-xs text-stone-500">{coords.displayName}</p>
          )}
        </div>

        {duplicates.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Possible duplicate listing
            </p>
            <p className="mt-1 text-sm text-amber-800">
              We found {duplicates.length === 1 ? "a studio" : "studios"} at or near this address.
              If this is yours, open it and sign in as the owner instead of creating another.
            </p>
            <ul className="mt-3 space-y-2">
              {duplicates.map((d) => (
                <li key={d.id} className="text-sm">
                  <Link
                    href={`/studios/${d.slug}`}
                    className="font-medium text-amber-950 underline hover:no-underline"
                  >
                    {d.name}
                  </Link>
                  {d.address && (
                    <span className="text-amber-800"> — {d.address}</span>
                  )}
                  <span className="ml-1 text-xs text-amber-700">
                    ({d.reason === "address" ? "same address" : "within ~80m"})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label htmlFor="contact_email" className="mb-1 block text-sm font-medium text-stone-700">
            Contact email for trial signups *
          </label>
          <input
            id="contact_email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
          <p className="mt-1 text-xs text-stone-500">
            We’ll email you when someone claims a free trial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="offers_trial"
            type="checkbox"
            checked={offersTrial}
            onChange={(e) => setOffersTrial(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
          />
          <label htmlFor="offers_trial" className="text-sm text-stone-700">
            Offer a free trial (one signup per email at your studio)
          </label>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pending || !coords}
            onClick={() => submit(false)}
            className="flex-1 rounded-lg bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-800 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create studio & add schedule"}
          </button>
        </div>
        {!coords && (
          <p className="text-xs text-stone-500">
            Use <span className="font-medium">Find on map</span> before creating so your studio appears in discovery.
          </p>
        )}
        {duplicates.length > 0 && coords && (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(true)}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
          >
            This is a different studio — create anyway
          </button>
        )}
      </div>
    </div>
  );
}
