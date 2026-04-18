import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGroupsColumns() {
  const { data, error } = await supabase.from('groups').select('*').limit(1)
  if (error) {
    console.error('Error:', error)
  } else if (data && data.length > 0) {
    console.log('Columns in groups:', Object.keys(data[0]))
  } else {
    // If no data, try to query from a view or just try a generic select
    console.log('No data in groups table')
  }
}

checkGroupsColumns()
