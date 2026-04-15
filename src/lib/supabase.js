import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ビルドは通すが、ブラウザのコンソールに状態を出す
if (typeof window !== 'undefined') {
  console.log('--- Supabase Connection Debug ---')
  console.log('URL status:', supabaseUrl ? 'Defined' : 'MISSING')
  console.log('Key status:', supabaseAnonKey ? 'Defined' : 'MISSING')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
