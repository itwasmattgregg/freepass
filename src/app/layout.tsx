import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { signOut } from "@/app/auth/actions";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FreePass – Discover classes nearby",
  description:
    "Find studios on the map, search and filter by class type, and sign up for free trial classes.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: { email?: string | null } | null = null;
  try {
    if (hasSupabaseEnv()) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }
  } catch {
    user = null;
  }

  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="text-lg font-semibold text-stone-900">
              FreePass
            </Link>
            <nav className="flex items-center gap-4 text-sm text-stone-600 sm:gap-6">
              <Link href="/" className="hover:text-stone-900">
                Discover
              </Link>
              <Link href="/studios/new" className="hover:text-stone-900">
                List your studio
              </Link>
              {user ? (
                <form action={signOut}>
                  <button type="submit" className="hover:text-stone-900">
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/auth/login?next=/studios/new"
                  className="hover:text-stone-900"
                >
                  Owner login
                </Link>
              )}
              <Link href="/privacy" className="hidden text-stone-400 hover:text-stone-700 sm:inline">
                Privacy
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
