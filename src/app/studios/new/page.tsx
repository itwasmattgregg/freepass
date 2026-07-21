import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { AddStudioForm } from "./AddStudioForm";

export const dynamic = "force-dynamic";

export default async function NewStudioPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold text-stone-900">Configuration needed</h1>
        <p className="mt-2 text-stone-600">
          Set Supabase env vars in <code>.env.local</code> to list a studio.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/studios/new");
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-stone-500 hover:text-stone-700">
        ← Back to discover
      </Link>
      <h1 className="text-3xl font-bold text-stone-900">List your studio</h1>
      <p className="mt-2 text-stone-600">
        Signed in as {user.email}. Add your address, place it on the map, then publish your schedule.
      </p>

      <AddStudioForm defaultEmail={user.email ?? ""} />
    </main>
  );
}
