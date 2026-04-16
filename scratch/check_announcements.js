
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAnnouncements() {
  const { data, error } = await supabase.from('announcements').select('*').limit(1);
  if (error) {
    console.error('Error fetching announcements:', error);
  } else {
    console.log('Announcements schema (first row):', data[0] || 'No data');
  }
}

checkAnnouncements();
