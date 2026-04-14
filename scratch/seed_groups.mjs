import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lytlafmmpjjxamwutljv.supabase.co';
const supabaseAnonKey = 'sb_publishable_dPoHJ6R5oEBcmYRNJ0u-2A_EKWDpIFW';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const groupsData = [
  // 1年生 (体験)
  ...['A','B','C','D','E','F','G','H','I'].map(c => ({ 
    login_id: `1${c}`, name: `1年${c}組`, departments: ['体験'], building: '南館', room: `1-${['A','B','C','D','E','F','G','H','I'].indexOf(c)+1}` 
  })),
  // 2年生 (食品)
  ...['A','B','C','D','E','F','G','H','I'].map(c => ({ 
    login_id: `2${c}`, name: `2年${c}組`, departments: ['食品'], building: '南館', room: `2-${['A','B','C','D','E','F','G','H','I'].indexOf(c)+1}` 
  })),
  // 3年生 (食品 + 物販 など複数部門の例として 3Aをセット)
  { 
    login_id: '3A', name: '3年A組', title: 'たちばなダイナー', departments: ['食品', '物販'], building: '南館', room: '3-1', description: 'おいしい食事とオリジナルグッズを販売中！'
  },
  ...['B','C','D','E','F','G','H','I'].map(c => ({ 
    login_id: `3${c}`, name: `3年${c}組`, departments: ['食品'], building: '南館', room: `3-${['A','B','C','D','E','F','G','H','I'].indexOf(c)+1}` 
  })),
  // 公演団体
  { 
    login_id: 'DRAMA', name: '演劇部', title: 'たちばな劇場2026', departments: ['公演'], building: '体育館', room: 'ステージ', description: '感動のステージをお届けします。',
    performances: [
      { part_id: 1, start_time: "09:30", end_time: "10:15", status: "none" },
      { part_id: 2, start_time: "13:30", end_time: "14:15", status: "none" },
      { part_id: 3, start_time: "10:00", end_time: "10:45", status: "none" }
    ]
  },
  { 
    login_id: 'WIND', name: '吹奏楽部', title: 'Summer Concert', departments: ['公演'], building: '体育館', room: 'ステージ',
    performances: [
      { part_id: 1, start_time: "11:00", end_time: "11:45", status: "none" },
      { part_id: 2, start_time: "15:00", end_time: "15:45", status: "none" },
      { part_id: 3, start_time: "11:15", end_time: "11:55", status: "none" }
    ]
  },
  { 
    login_id: 'DANCE', name: 'ダンス同好会', title: 'STREET VIBES', departments: ['公演'], building: '体育館', room: 'ステージ',
    performances: [
      { part_id: 1, start_time: "10:30", end_time: "11:00", status: "none" },
      { part_id: 3, start_time: "09:15", end_time: "09:45", status: "none" }
    ]
  },
  // 展示
  { login_id: 'ART', name: '美術部', title: '凌雲展', departments: ['展示'], building: '南館', room: '美術室' },
  { login_id: 'SCI', name: '科学部', title: 'サイエンスラボ', departments: ['展示'], building: '南館', room: '地学室' },
  // 冊子
  { login_id: 'BOOK', name: '文化委員会', title: '公式パンフレット配布', departments: ['冊子'], building: '各所', room: '受付' },
  // 複数部門の例：生徒会が物販と冊子を担当
  { login_id: 'COUNCIL', name: '生徒会', title: '本部デスク', departments: ['冊子', '物販'], building: '南館', room: '入口' }
];

async function seed() {
  console.log('=== たちばな祭2026 正規化データ投入開始 ===');
  
  // 先に message などをクリーンアップ
  await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('performances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('group_activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  for (const g of groupsData) {
    console.log(`投入中: ${g.name}`);
    
    // 1. Group 挿入
    const { data: group, error: gErr } = await supabase.from('groups').insert([{
      login_id: g.login_id,
      password: `tachibana${g.login_id}`,
      name: g.name,
      title: g.title || '',
      building: g.building,
      room: g.room,
      description: g.description || '',
      social_links: {},
      editing_locked: false
    }]).select().single();

    if (gErr) {
      console.error(`Group失敗: ${g.login_id}`, gErr.message);
      continue;
    }

    // 2. Activities (部門) 挿入
    const activities = g.departments.map(dept => ({
      group_id: group.id,
      department: dept,
      status: dept === '冊子' ? 'distributing' : 'open',
      waiting_time: 0
    }));
    const { error: aErr } = await supabase.from('group_activities').insert(activities);
    if (aErr) console.error(`Activity失敗: ${g.login_id}`, aErr.message);

    // 3. Performances 挿入
    if (g.performances) {
      const perfs = g.performances.map(p => ({
        group_id: group.id,
        ...p
      }));
      const { error: pErr } = await supabase.from('performances').insert(perfs);
      if (pErr) console.error(`Performance失敗: ${g.login_id}`, pErr.message);
    }
  }

  console.log('✅ 全データの投入に成功しました。');
}

seed();
