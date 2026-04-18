import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const groupId = '7aedbfc4-27bb-4105-a788-f171c41ef950';

const performances = [
  // Part 1: 2公演
  { group_id: groupId, part_id: 1, start_time: '09:00', end_time: '09:30', status: 'none', reception_status: 'open' },
  { group_id: groupId, part_id: 1, start_time: '10:00', end_time: '10:30', status: 'none', reception_status: 'open' },
  
  // Part 2: 3公演
  { group_id: groupId, part_id: 2, start_time: '13:00', end_time: '13:30', status: 'none', reception_status: 'open' },
  { group_id: groupId, part_id: 2, start_time: '14:00', end_time: '14:30', status: 'none', reception_status: 'open' },
  { group_id: groupId, part_id: 2, start_time: '15:00', end_time: '15:30', status: 'none', reception_status: 'open' },
  
  // Part 3: 4公演
  { group_id: groupId, part_id: 3, start_time: '09:00', end_time: '09:30', status: 'none', reception_status: 'open' },
  { group_id: groupId, part_id: 3, start_time: '10:00', end_time: '10:30', status: 'none', reception_status: 'open' },
  { group_id: groupId, part_id: 3, start_time: '11:00', end_time: '11:30', status: 'none', reception_status: 'open' },
  { group_id: groupId, part_id: 3, start_time: '11:45', end_time: '12:15', status: 'none', reception_status: 'open' }
];

async function insertDummyData() {
  console.log('Inserting dummy data for group:', groupId);
  const { data, error } = await supabase
    .from('performances')
    .insert(performances);

  if (error) {
    console.error('Error inserting data:', error);
  } else {
    console.log('Successfully inserted dummy data.');
  }
}

insertDummyData();
