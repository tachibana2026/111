
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lytlafmmpjjxamwutljv.supabase.co'
const supabaseKey = 'sb_publishable_dPoHJ6R5oEBcmYRNJ0u-2A_EKWDpIFW'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  const { data, error } = await supabase.from('lost_found').select('*').limit(1)
  if (error) {
    console.error('Error:', error)
  } else if (data && data.length > 0) {
    console.log('Columns in lost_found:', Object.keys(data[0]))
  } else {
    console.log('No data to check columns')
  }
}

checkColumns()
