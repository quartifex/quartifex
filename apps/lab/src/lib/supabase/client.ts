import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client. The publishable key is safe to ship; row-level security guards the data. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  );
}
