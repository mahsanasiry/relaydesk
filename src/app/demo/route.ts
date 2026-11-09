import { redirect } from "next/navigation";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/features/auth/demo";
import { APP_HOME, LOGIN_PATH } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Signs in to the sample workspace so a visitor can look around without an account. It is a
 * GET route so a plain link in the README or on the home page can open it.
 */
export async function GET(): Promise<never> {
  let signedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (error) {
      console.error("The demo sign in was refused:", error.code ?? error.message);
    }
    signedIn = !error;
  } catch (error) {
    // The visitor only sees "not available", so the reason has to be in the server log.
    console.error("The demo sign in could not reach the auth service:", error);
  }

  // redirect() works by throwing, so it stays outside the try block above.
  redirect(signedIn ? APP_HOME : `${LOGIN_PATH}?demo=unavailable`);
}
