import { createClient } from '@supabase/supabase-js'

// Next.jsのビルド時置換を確実にするため、変数に代入せず直接 process.env を使用します
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

// デバッグ用（ブラウザでのみ動作）
if (typeof window !== 'undefined') {
  console.log('Supabase initialized with:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Real URL' : 'Placeholder');
}
