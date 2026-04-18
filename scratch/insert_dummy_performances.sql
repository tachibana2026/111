-- １団体（オーケストラ部 (全体)）の公演時間ダミーデータ投入スクリプト
-- Part 1: 2公演
-- Part 2: 3公演
-- Part 3: 4公演

-- 既存の公演データを削除（対象団体のみ）
DELETE FROM performances 
WHERE group_id IN (SELECT id FROM groups WHERE name = 'オーケストラ部 (全体)');

-- データの投入
INSERT INTO performances (group_id, part_id, start_time, end_time, status, reception_status)
SELECT id, 1, '09:00', '09:30', 'none', 'open' FROM groups WHERE name = 'オーケストラ部 (全体)'
UNION ALL
SELECT id, 1, '10:30', '11:00', 'none', 'open' FROM groups WHERE name = 'オーケストラ部 (全体)'
UNION ALL
SELECT id, 2, '13:00', '13:45', 'none', 'open' FROM groups WHERE name = 'オーケストラ部 (全体)'
UNION ALL
SELECT id, 2, '14:30', '15:15', 'none', 'open' FROM groups WHERE name = 'オーケストラ部 (全体)'
UNION ALL
SELECT id, 2, '15:30', '16:00', 'none', 'open' FROM groups WHERE name = 'オーケストラ部 (全体)'
UNION ALL
SELECT id, 3, '09:00', '09:30', 'none', 'open' FROM groups WHERE name = 'オーケストラ部 (全体)'
UNION ALL
SELECT id, 3, '10:00', '10:30', 'none', 'open' FROM groups WHERE name = 'オーケストラ部 (全体)'
UNION ALL
SELECT id, 3, '11:00', '11:30', 'none', 'open' FROM groups WHERE name = 'オーケストラ部 (全体)'
UNION ALL
SELECT id, 3, '11:45', '12:15', 'none', 'open' FROM groups WHERE name = 'オーケストラ部 (全体)';

-- 確認用
SELECT g.name, p.part_id, p.start_time, p.end_time 
FROM performances p
JOIN groups g ON p.group_id = g.id
WHERE g.name = 'オーケストラ部 (全体)'
ORDER BY p.part_id, p.start_time;
