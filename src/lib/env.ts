export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

// The variables are read by their full names so Next.js can inline them into the browser bundle.
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !publishableKey) {
    throw new Error(
      `Supabase is not configured. Missing: ${missing.join(", ")}. Copy .env.example to .env.local and fill in the values.`,
    );
  }

  try {
    new URL(url);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not a valid URL. Use the project URL from the Supabase dashboard, for example https://abcdefgh.supabase.co.",
    );
  }

  return { url, publishableKey };
}
