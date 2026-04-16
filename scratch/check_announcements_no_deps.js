
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function checkAnnouncements() {
  const { data, error } = await supabase.from('announcements').select('*').limit(1);
  if (error) {
    console.error('Error fetching announcements:', error);
  } else {
    console.log('Announcements schema:');
    console.log(data && data[0] ? Object.keys(data[0]) : 'No data found');
    console.log('Sample data:', data ? data[0] : 'None');
  }
}

checkAnnouncements();
