import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

export interface SessionResult {
  response: NextResponse;
  isSignedIn: boolean;
}

/**
 * Refreshes the auth cookies before the page renders. The access token expires after an hour,
 * and only the proxy can write the renewed cookies back onto the response.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Verifies the token signature without a network round trip. Pages that act on behalf of
  // the user still call getUser(), which asks the auth server.
  const { data } = await supabase.auth.getClaims();

  return { response, isSignedIn: Boolean(data?.claims) };
}
