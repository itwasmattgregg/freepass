"use client";

import { useActionState } from "react";
import { requestMagicLink } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(requestMagicLink, null);

  if (state?.sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-medium">Check your email</p>
        <p className="mt-1 text-emerald-800">
          We sent a magic link. Open it on this device to continue. The link expires in about an hour.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@studio.com"
          className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "Sending link…" : "Email me a login link"}
      </button>
      <p className="text-xs text-stone-500">
        No password. We email you a one-time link to manage your studio listing.
      </p>
    </form>
  );
}
