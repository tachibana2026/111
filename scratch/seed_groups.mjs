import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lytlafmmpjjxamwutljv.supabase.co';
const supabaseAnonKey = 'sb_publishable_dPoHJ6R5oEBcmYRNJ0u-2A_EKWDpIFW';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const grades = ['1', '2', '3'];
const classes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

async function seed() {
  console.log('=== たちばな祭2026 正規団体データ投入 ===');
  
  // 1. 既存のメッセージを削除
  console.log('既存メッセージを削除中...');
  const { error: msgErr } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (msgErr) console.log('メッセージ削除エラー（テーブルが空の場合無視）:', msgErr.message);
  
  // 2. 既存の団体データを削除
  console.log('既存団体データを削除中...');
  const { error: delErr } = await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error('団体削除エラー:', delErr.message);
    return;
  }
  console.log('既存データの削除完了');

  // 3. 正規団体データを作成
  const groups = [];
  for (const grade of grades) {
    for (const cls of classes) {
      groups.push({
        login_id: `${grade}${cls}`,
        password: `tachibana${grade}${cls}`,
        name: `${grade}年${cls}組`,
        department: grade === '1' ? '体験' : '食品',
        grade: `${grade}年`,
        building: '南館',
        room: `${grade}-${classes.indexOf(cls) + 1}`,
        description: '',
        waiting_time: 0,
        status: 'open',
        editing_locked: false,
        social_links: {},
      });
    }
  }

  // 4. データを投入
  console.log(`${groups.length}件の団体データを投入中...`);
  const { data, error } = await supabase.from('groups').insert(groups).select();

  if (error) {
    console.error('投入エラー:', error.message);
    return;
  }

  console.log(`✅ ${data.length}件の団体データを正常に投入しました！`);
  console.log('');
  console.log('--- 投入された団体一覧 ---');
  data.sort((a, b) => a.login_id.localeCompare(b.login_id));
  for (const g of data) {
    console.log(`  ${g.login_id} | ${g.name} | ${g.department} | ${g.building} ${g.room} | PW: ${g.password}`);
  }
  console.log('');
  console.log('=== 完了 ===');
}

seed().catch(console.error);
