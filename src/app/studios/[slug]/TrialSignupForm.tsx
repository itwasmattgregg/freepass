"use client";

import { useState } from "react";
import { signUpForTrial } from "./actions";

export function TrialSignupForm({ studioId }: { studioId: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const result = await signUpForTrial(studioId, email.trim().toLowerCase());
    if (result.success) {
      setStatus("success");
      setMessage("You’re signed up! The studio has been notified and will be in touch.");
      setEmail("");
    } else {
      setStatus("error");
      setMessage(result.error ?? "Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="trial-email" className="sr-only">
          Email
        </label>
        <input
          id="trial-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={status === "loading"}
          className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {status === "loading" ? "Signing up…" : "Sign up for trial"}
      </button>
      {message && (
        <p
          className={`w-full text-sm sm:col-span-2 ${
            status === "success" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
