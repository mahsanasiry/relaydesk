import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveAuthRedirect } from "@/lib/auth/redirects";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, isSignedIn } = await updateSession(request);
  const target = resolveAuthRedirect({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isSignedIn,
  });

  if (target === null) {
    return response;
  }

  const redirect = NextResponse.redirect(new URL(target, request.url));
  // A refreshed session must survive the redirect, or the next request starts logged out.
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
