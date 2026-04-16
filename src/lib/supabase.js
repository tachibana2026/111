import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Client
 * 
 * Note: Next.js requires the 'NEXT_PUBLIC_' prefix to expose environment variables
 * to the client-side bundle. These are replaced at build time.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)
