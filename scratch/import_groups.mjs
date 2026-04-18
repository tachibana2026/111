import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = './scratch/groups_to_import.xlsx';

async function importGroups() {
  console.log('🚀 団体情報の一括インポートを開始します...');

  if (!fs.existsSync(filePath)) {
    console.error('❌ エラー: インポート用ファイルが見つかりません。');
    return;
  }

  const buf = fs.readFileSync(filePath);
  const workbook = XLSX.read(buf);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // ヘッダー行を取得してマッピングを確認
  const rawData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 ${rawData.length} 件のデータを処理中...`);

  const groupsToUpsert = [];

  for (const row of rawData) {
    const entry = {};
    
    // マッピング定義
    // Excelの見出し: DBのカラム名
    const columnMapping = {
      'class': 'name',
      'login_id': 'login_id',
      'password': 'password',
      'title': 'title',
      'description': 'description',
      'department': 'department',
      'building': 'building',
      'room': 'room',
      'social_links': 'social_links'
    };

    for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
      let value = row[excelCol];

      // ユーザー指示の処理
      if (value === '/' || value === '／') {
        // 「/」は不要な情報（空欄にする）
        entry[dbCol] = '';
      } else if (value === undefined || value === null || value === '') {
        // 空欄は未定の情報（今回は空文字またはデフォルト値に設定）
        // 更新の場合は既存の値を維持したいが、一括UPSERTの場合は一旦空にするか
        // もしDB側で既存の値を維持したい場合は、そのカラムをentryに入れない
        // ただし新規作成の場合はマズいので、ここでは空文字を入れる
        entry[dbCol] = ''; 
      } else {
        entry[dbCol] = value.toString();
      }
    }

    // パスワードが空の場合のデフォルト処理
    if (!entry.password && entry.login_id) {
       entry.password = `tachibana${entry.login_id}`;
    }

    // SNSリンクがJSON形式でない場合の考慮（とりあえず空オブジェクト）
    if (!entry.social_links) {
      entry.social_links = {};
    } else if (typeof entry.social_links === 'string') {
      try {
        entry.social_links = JSON.parse(entry.social_links);
      } catch (e) {
        // JSONでなければそのまま入れるか、URLなら特定のキーに入れるなどの処理
        entry.social_links = { website: entry.social_links };
      }
    }

    // デフォルトステータスなどの設定
    entry.reception_status = entry.reception_status || 'open';
    entry.waiting_time = entry.waiting_time || 0;
    entry.ticket_status = entry.ticket_status || 'none';
    entry.editing_locked = false;

    // 特殊なフラグの自動設定
    entry.has_reception = ['体験', '食品'].includes(entry.department);
    entry.has_waiting_time = ['体験', '食品'].includes(entry.department);
    entry.has_ticket_status = ['冊子', '物販'].includes(entry.department);
    entry.has_performances = entry.department === '公演';

    groupsToUpsert.push(entry);
  }

  // 10件ずつ分割してUPSERT (Supabaseの制限回避のため)
  const chunkSize = 10;
  for (let i = 0; i < groupsToUpsert.length; i += chunkSize) {
    const chunk = groupsToUpsert.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('groups')
      .upsert(chunk, { onConflict: 'login_id' });

    if (error) {
      console.error(`❌ エラー (chunk ${i/chunkSize + 1}):`, error.message);
    } else {
      console.log(`✅ ${chunk.length} 件を更新しました (${i + chunk.length}/${groupsToUpsert.length})`);
    }
  }

  console.log('✨ 全データのインポートが完了しました。');
}

importGroups().catch(console.error);
