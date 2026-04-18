import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTicketStatus() {
  console.log('🚀 groupsテーブルのticket_statusを全て"none"に更新します...');

  // 全ての行を取得して、ループで更新してみる（RLSの影響を確認するため）
  const { data: groups, error: fetchError } = await supabase
    .from('groups')
    .select('id, name, ticket_status');

  if (fetchError) {
    console.error('❌ データの取得に失敗しました:', fetchError.message);
    return;
  }

  console.log(`📊 ${groups.length} 件のデータを更新対象としています...`);

  let successCount = 0;
  let failCount = 0;

  for (const group of groups) {
    const { error: updateError } = await supabase
      .from('groups')
      .update({ ticket_status: 'none' })
      .eq('id', group.id);

    if (updateError) {
      console.error(`❌ ${group.name} の更新に失敗:`, updateError.message);
      failCount++;
    } else {
      successCount++;
    }
  }

  console.log(`✅ 更新完了: 成功 ${successCount} 件, 失敗 ${failCount} 件`);
}

updateTicketStatus().catch(console.error);
