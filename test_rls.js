import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testRLS() {
  console.log('Testing RLS leak on groups table...')
  const { data, error } = await supabase
    .from('groups')
    .select('name, password')
    .limit(1)

  if (error) {
    console.log('RLS is working (or other error):', error.message)
  } else if (data && data.length > 0) {
    if (data[0].password) {
      console.log('⚠️ SECURITY LEAK: Passwords are readable by public!')
      console.log('First group password found:', data[0].password)
    } else {
      console.log('Column password is not readable (good), but rows are readable.')
    }
  } else {
    console.log('No data returned.')
  }
}

testRLS()
