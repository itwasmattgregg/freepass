import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-stone-500 hover:text-stone-700">
        ← Back
      </Link>
      <h1 className="text-3xl font-bold text-stone-900">Terms of Use</h1>
      <p className="mt-2 text-stone-600">Last updated: July 16, 2026</p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-stone-700">
        <p>
          FreePass is a directory for discovering studios and free trial classes. By using the service you agree to these terms.
        </p>
        <h2 className="text-lg font-semibold text-stone-900">For visitors</h2>
        <p>
          Trial signups are limited to one email per studio. Providing false information or attempting to bypass limits may result in blocked access.
        </p>
        <h2 className="text-lg font-semibold text-stone-900">For studio owners</h2>
        <p>
          You are responsible for the accuracy of your listing and for following up on trial signups. Do not list studios you do not operate. Duplicate listings for the same location may be removed.
        </p>
        <h2 className="text-lg font-semibold text-stone-900">Service</h2>
        <p>
          FreePass is provided as-is without warranties. Features may change. We may suspend accounts or listings that abuse the platform.
        </p>
        <h2 className="text-lg font-semibold text-stone-900">Payments</h2>
        <p>
          Class registration and payments through FreePass are not yet available. Any future payment features will be described here before launch.
        </p>
      </div>
    </main>
  );
}
