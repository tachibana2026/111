-- ============================================================
-- たちばな祭2026 正規団体データ投入スクリプト
-- 1~3年 各年A~I組（計27団体）
-- ============================================================
-- ⚠️ 注意: 既存のgroupsデータをすべて削除してから投入します
-- Supabase SQL Editorで実行してください
-- ============================================================

-- 0. titleカラムの追加（既に存在する場合はスキップ）
ALTER TABLE groups ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';

-- 1. gradeカラムの削除（学年情報はnameカラムから取得するため不要）
ALTER TABLE groups DROP COLUMN IF EXISTS grade;

-- 2. 既存データの削除（messages テーブルに外部キーがある場合はそちらも先に削除）
DELETE FROM messages;
DELETE FROM groups;

-- 3. 正規団体データの投入
-- title は空欄（各団体がダッシュボードから入力）
-- 学年はnameカラム（例: 1年A組）から判別
INSERT INTO groups (login_id, password, name, title, department, building, room, description, waiting_time, status, editing_locked, social_links) VALUES
-- === 1年生 ===
('1A', 'tachibana1A', '1年A組', '', '体験', '南館', '1-1', '', 0, 'open', false, '{}'),
('1B', 'tachibana1B', '1年B組', '', '体験', '南館', '1-2', '', 0, 'open', false, '{}'),
('1C', 'tachibana1C', '1年C組', '', '体験', '南館', '1-3', '', 0, 'open', false, '{}'),
('1D', 'tachibana1D', '1年D組', '', '体験', '南館', '1-4', '', 0, 'open', false, '{}'),
('1E', 'tachibana1E', '1年E組', '', '体験', '南館', '1-5', '', 0, 'open', false, '{}'),
('1F', 'tachibana1F', '1年F組', '', '体験', '南館', '1-6', '', 0, 'open', false, '{}'),
('1G', 'tachibana1G', '1年G組', '', '体験', '南館', '1-7', '', 0, 'open', false, '{}'),
('1H', 'tachibana1H', '1年H組', '', '体験', '南館', '1-8', '', 0, 'open', false, '{}'),
('1I', 'tachibana1I', '1年I組', '', '体験', '南館', '1-9', '', 0, 'open', false, '{}'),

-- === 2年生 ===
('2A', 'tachibana2A', '2年A組', '', '食品', '南館', '2-1', '', 0, 'open', false, '{}'),
('2B', 'tachibana2B', '2年B組', '', '食品', '南館', '2-2', '', 0, 'open', false, '{}'),
('2C', 'tachibana2C', '2年C組', '', '食品', '南館', '2-3', '', 0, 'open', false, '{}'),
('2D', 'tachibana2D', '2年D組', '', '食品', '南館', '2-4', '', 0, 'open', false, '{}'),
('2E', 'tachibana2E', '2年E組', '', '食品', '南館', '2-5', '', 0, 'open', false, '{}'),
('2F', 'tachibana2F', '2年F組', '', '食品', '南館', '2-6', '', 0, 'open', false, '{}'),
('2G', 'tachibana2G', '2年G組', '', '食品', '南館', '2-7', '', 0, 'open', false, '{}'),
('2H', 'tachibana2H', '2年H組', '', '食品', '南館', '2-8', '', 0, 'open', false, '{}'),
('2I', 'tachibana2I', '2年I組', '', '食品', '南館', '2-9', '', 0, 'open', false, '{}'),

-- === 3年生 ===
('3A', 'tachibana3A', '3年A組', '', '食品', '南館', '3-1', '', 0, 'open', false, '{}'),
('3B', 'tachibana3B', '3年B組', '', '食品', '南館', '3-2', '', 0, 'open', false, '{}'),
('3C', 'tachibana3C', '3年C組', '', '食品', '南館', '3-3', '', 0, 'open', false, '{}'),
('3D', 'tachibana3D', '3年D組', '', '食品', '南館', '3-4', '', 0, 'open', false, '{}'),
('3E', 'tachibana3E', '3年E組', '', '食品', '南館', '3-5', '', 0, 'open', false, '{}'),
('3F', 'tachibana3F', '3年F組', '', '食品', '南館', '3-6', '', 0, 'open', false, '{}'),
('3G', 'tachibana3G', '3年G組', '', '食品', '南館', '3-7', '', 0, 'open', false, '{}'),
('3H', 'tachibana3H', '3年H組', '', '食品', '南館', '3-8', '', 0, 'open', false, '{}'),
('3I', 'tachibana3I', '3年I組', '', '食品', '南館', '3-9', '', 0, 'open', false, '{}');

-- 投入結果の確認
SELECT login_id, name, title, department, building, room FROM groups ORDER BY login_id;
