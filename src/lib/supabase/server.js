import { createServerClient } from '@supabase/ssr'

// Pages Router環境で App Router専用の next/headers が呼ばれるとビルドが壊れるため、
// 環境変数ガードも含めて無害化
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) { return '' },
      set(name, value, options) {},
      remove(name, options) {},
    },
  })
}
