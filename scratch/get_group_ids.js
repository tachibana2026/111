
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, title')
    .order('name');

  if (error) {
    console.error('Error fetching groups:', error);
    return;
  }

  console.log('--- Group IDs and Names ---');
  data.forEach(group => {
    console.log(`ID: ${group.id} | Name: ${group.name}${group.title ? ` (${group.title})` : ''}`);
  });
  console.log('---------------------------');
}

getGroups();
