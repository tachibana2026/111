import { supabase } from '../src/lib/supabase.js';

async function checkAnnouncements() {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('Error:', error.message);
    } else {
      console.log('Current announcements:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Connection failed:', e);
  }
}

checkAnnouncements();
