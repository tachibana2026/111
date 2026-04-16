
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
  const { data, error } = await supabase.from('lost_found').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Schema check (first row):', data);
  }
}

checkSchema();
