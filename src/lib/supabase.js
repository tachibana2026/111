import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 環境変数が読み込めていない場合は、ビルド自体を強制終了させる
// これにより、Vercelが環境変数を認識しているかを100%判断できます
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  throw new Error(
    "Supabase configuration is missing or invalid. " +
    "Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel settings. " +
    "Make sure 'Production' environment is checked."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
