
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lytlafmmpjjxamwutljv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5dGxhZm1tcGpqeGFtd3V0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTEwOTg5NjEsImV4cCI6MjAyNjY3NDk2MX0.sb_publishable_dPoHJ6R5oEBcmYRNJ0u-2A_EKWDpIFW'
);

async function checkSchema() {
  const { data, error } = await supabase.from('lost_found').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', data.length > 0 ? Object.keys(data[0]) : 'No data');
    console.log('Sample Data:', data[0]);
  }
}

checkSchema();
