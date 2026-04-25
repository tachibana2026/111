import { supabase } from './src/lib/supabase';

async function test() {
  const { data, error } = await supabase.from('announcements').select('*').limit(1);
  if (error) {
    console.log('Error or table not found:', error.message);
  } else {
    console.log('Table exists, data:', data);
  }
}

test();
