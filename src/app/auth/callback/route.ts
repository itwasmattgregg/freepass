import { NextResponse } from "next/server";
import { consumeMagicLink, issueSessionCookie } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const nextParam = searchParams.get("next");
  const fallbackNext =
    nextParam?.startsWith("/") ? nextParam : "/studios/new";

  if (token) {
    const result = await consumeMagicLink(token);
    if (result) {
      const cookie = issueSessionCookie(result.user.id);
      const next = result.nextPath.startsWith("/") ? result.nextPath : fallbackNext;
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/login?next=${encodeURIComponent(fallbackNext)}`
  );
}
