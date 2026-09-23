import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Supabase browser client — for use in Client Components only.
 * Creates a new instance per call (SSR-safe singleton pattern not needed
 * for browser clients in Next.js App Router).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
