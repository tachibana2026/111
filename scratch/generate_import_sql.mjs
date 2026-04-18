import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = './scratch/groups_to_import.xlsx';
const outputSqlPath = './scratch/import_groups.sql';

function escapeSql(str) {
  if (str === null || str === undefined) return "''";
  return `'${str.toString().replace(/'/g, "''")}'`;
}

function generateSql() {
  console.log('🚀 SQLの生成を開始します...');

  if (!fs.existsSync(filePath)) {
    console.error('❌ エラー: インポート用ファイルが見つかりません。');
    return;
  }

  const buf = fs.readFileSync(filePath);
  const workbook = XLSX.read(buf);
  
  const groupsToUpsert = [];

  // HR と 有志 の両方のシートを処理
  const targetSheets = ['HR', '有志'];
  
  for (const sheetName of targetSheets) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      console.warn(`⚠️ 警告: シート "${sheetName}" が見つかりません。スキップします。`);
      continue;
    }

    const rawData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📊 シート "${sheetName}": ${rawData.length} 件のデータを読み込みました。`);

    for (const row of rawData) {
      // 'class' または 'group' を 'name' にマッピング
      const name = row['class'] || row['group'] || '';
      if (!name) continue;

      let login_id = row['login_id'];
      if (!login_id || login_id === '/' || login_id === '／') {
        // IDが未定や斜線の場合は、一旦名称をIDとして使用（英数字のみに変換するのが理想だが、ここでは一旦そのまま）
        login_id = name;
      }
      
      let password = row['password'];
      let title = row['title'];
      let description = row['description'];
      let department = row['department'] || '';
      let building = row['building'] || '';
      let room = row['room'] || '';
      let social_links_raw = row['social_links'] || '';

      const clean = (val) => {
        if (val === '/' || val === '／') return '';
        if (val === undefined || val === null) return '';
        return val.toString().trim();
      };

      password = clean(password);
      if (!password && login_id) password = `tachibana${login_id}`;
      title = clean(title);
      description = clean(description);
      department = clean(department);
      building = clean(building);
      room = clean(room);
      social_links_raw = clean(social_links_raw);

      let social_links = '{}';
      if (social_links_raw && social_links_raw.startsWith('{')) {
        social_links = social_links_raw;
      } else if (social_links_raw) {
        social_links = JSON.stringify({ website: social_links_raw });
      }

      let name_initial = row['initial'] || row['kana'] || '';
      name_initial = clean(name_initial).charAt(0);

      const reception_status = 'open';
      const waiting_time = 0;
      const ticket_status = 'distributing';
      const editing_locked = false;

      // フラグ判定 (部門にキーワードが含まれているかで判定)
      const has_reception = department.includes('体験') || department.includes('食品');
      const has_waiting_time = department.includes('体験') || department.includes('食品');
      const has_ticket_status = department.includes('冊子') || department.includes('物販');
      const has_performances = department.includes('公演');

      groupsToUpsert.push(`(${escapeSql(login_id)}, ${escapeSql(name)}, ${escapeSql(name_initial)}, ${escapeSql(password)}, ${escapeSql(title)}, ${escapeSql(description)}, ${escapeSql(department)}, ${escapeSql(building)}, ${escapeSql(room)}, ${escapeSql(social_links)}, ${escapeSql(reception_status)}, ${waiting_time}, ${escapeSql(ticket_status)}, ${has_reception}, ${has_waiting_time}, ${has_ticket_status}, ${has_performances}, ${editing_locked})`);
    }
  }

  let sql = `-- たちばな祭2026 団体情報・初期化投入スクリプト
-- 生成日時: ${new Date().toLocaleString()}

-- 既存データの全削除 (リレーションの都合上、子テーブルから削除)
DELETE FROM messages;
DELETE FROM performances;
DELETE FROM group_activities;
DELETE FROM groups;

-- データの投入
INSERT INTO groups (
  login_id, name, name_initial, password, title, description, department, building, room, social_links,
  reception_status, waiting_time, ticket_status, 
  has_reception, has_waiting_time, has_ticket_status, has_performances,
  editing_locked
) VALUES
`;

  sql += groupsToUpsert.join(',\n') + ';\n';
  fs.writeFileSync(outputSqlPath, sql);
  console.log(`✅ SQLを生成しました (全削除リセット方式): ${outputSqlPath}`);
  console.log(`📝 合計 ${groupsToUpsert.length} 件のデータが含まれています。`);
}


generateSql();
