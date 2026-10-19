import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = nextParam?.startsWith("/") ? nextParam : "/studios/new";

  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-stone-500 hover:text-stone-700">
        ← Back
      </Link>
      <h1 className="text-3xl font-bold text-stone-900">Studio owner login</h1>
      <p className="mt-2 text-stone-600">
        Sign in to list your studio or manage your schedule. Discovering classes stays open — no account needed.
      </p>
      <LoginForm next={next} />
    </main>
  );
}
