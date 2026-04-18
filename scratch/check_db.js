
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lytlafmmpjjxamwutljv.supabase.co'
const supabaseKey = 'sb_publishable_dPoHJ6R5oEBcmYRNJ0u-2A_EKWDpIFW'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLostFound() {
  const { data, error } = await supabase.from('lost_found').select('*')
  if (error) {
    console.error('Error fetching lost_found:', error)
    return
  }
  console.log('Lost Found Items count:', data.length)
  console.log('Items:', JSON.stringify(data, null, 2))
}

checkLostFound()
