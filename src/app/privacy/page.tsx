import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 prose prose-stone">
      <Link href="/" className="mb-6 inline-block text-sm text-stone-500 no-underline hover:text-stone-700">
        ← Back
      </Link>
      <h1 className="text-3xl font-bold text-stone-900">Privacy Policy</h1>
      <p className="text-stone-600">Last updated: July 16, 2026</p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-stone-700">
        <p>
          FreePass helps people discover studios and claim free trial classes. This policy explains what we collect and how we use it.
        </p>
        <h2 className="text-lg font-semibold text-stone-900">Information we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Studio owner account email (via magic-link login).</li>
          <li>Studio listing details you provide (name, address, schedule, contact email).</li>
          <li>Trial signup emails when someone claims a free trial at a studio.</li>
          <li>Basic technical data such as IP address for rate limiting and abuse prevention.</li>
        </ul>
        <h2 className="text-lg font-semibold text-stone-900">How we use information</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>To show studios and schedules on the map and studio pages.</li>
          <li>To notify studio owners when someone signs up for a free trial.</li>
          <li>To prevent duplicate trial claims and abusive registrations.</li>
        </ul>
        <h2 className="text-lg font-semibold text-stone-900">Sharing</h2>
        <p>
          Trial signup emails are shared with the studio that received the signup. We use infrastructure providers (e.g. Supabase, email delivery) to operate the service. We do not sell personal information.
        </p>
        <h2 className="text-lg font-semibold text-stone-900">Retention &amp; contact</h2>
        <p>
          You can request deletion of a studio listing or trial signup by contacting the site operator. Studio owners can update their contact email from the manage page.
        </p>
      </div>
    </main>
  );
}
