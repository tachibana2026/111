-- ============================================================
-- たちばな祭2026 最終正規団体データ投入スクリプト (全35団体)
-- ============================================================
-- 1~3年 クラス団体 + 文化系部活動 + 委員会
-- 公演・展示・冊子部門を網羅し、end_time対応済みのスケジュールを投入します
-- ============================================================

-- 0. テーブル構造の整理
ALTER TABLE groups ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS booklet_status TEXT DEFAULT 'distributing';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS performance_day1 JSONB DEFAULT '[]';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS performance_day2 JSONB DEFAULT '[]';
ALTER TABLE groups DROP COLUMN IF EXISTS grade;

-- 1. 既存データの削除
-- メッセージも削除する場合は以下を有効化
-- DELETE FROM messages;
DELETE FROM groups;

-- 2. 正規団体データの投入
INSERT INTO groups (login_id, password, name, title, department, building, room, description, waiting_time, status, booklet_status, editing_locked, social_links, performance_day1, performance_day2) VALUES

-- === 1年生 (体験部門) ===
('1A', 'tachibana1A', '1年A組', '', '体験', '南館', '1-1', '1Aによる体験型アトラクションです！', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('1B', 'tachibana1B', '1年B組', '', '体験', '南館', '1-2', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('1C', 'tachibana1C', '1年C組', '', '体験', '南館', '1-3', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('1D', 'tachibana1D', '1年D組', '', '体験', '南館', '1-4', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('1E', 'tachibana1E', '1年E組', '', '体験', '南館', '1-5', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('1F', 'tachibana1F', '1年F組', '', '体験', '南館', '1-6', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('1G', 'tachibana1G', '1年G組', '', '体験', '南館', '1-7', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('1H', 'tachibana1H', '1年H組', '', '体験', '南館', '1-8', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('1I', 'tachibana1I', '1年I組', '', '体験', '南館', '1-9', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),

-- === 2年生 (食品部門) ===
('2A', 'tachibana2A', '2年A組', '', '食品', '南館', '2-1', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('2B', 'tachibana2B', '2年B組', '', '食品', '南館', '2-2', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('2C', 'tachibana2C', '2年C組', '', '食品', '南館', '2-3', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('2D', 'tachibana2D', '2年D組', '', '食品', '南館', '2-4', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('2E', 'tachibana2E', '2年E組', '', '食品', '南館', '2-5', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('2F', 'tachibana2F', '2年F組', '', '食品', '南館', '2-6', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('2G', 'tachibana2G', '2年G組', '', '食品', '南館', '2-7', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('2H', 'tachibana2H', '2年H組', '', '食品', '南館', '2-8', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('2I', 'tachibana2I', '2年I組', '', '食品', '南館', '2-9', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),

-- === 3年生 (食品部門) ===
('3A', 'tachibana3A', '3年A組', '', '食品', '南館', '3-1', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('3B', 'tachibana3B', '3年B組', '', '食品', '南館', '3-2', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('3C', 'tachibana3C', '3年C組', '', '食品', '南館', '3-3', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('3D', 'tachibana3D', '3年D組', '', '食品', '南館', '3-4', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('3E', 'tachibana3E', '3年E組', '', '食品', '南館', '3-5', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('3F', 'tachibana3F', '3年F組', '', '食品', '南館', '3-6', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('3G', 'tachibana3G', '3年G組', '', '食品', '南館', '3-7', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('3H', 'tachibana3H', '3年H組', '', '食品', '南館', '3-8', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('3I', 'tachibana3I', '3年I組', '', '食品', '南館', '3-9', '', 0, 'open', 'distributing', false, '{}', '[]', '[]'),

-- === 公演部門 (部活動等) ===
('DRAMA', 'pw-drama', '演劇部', 'たちばな劇場2026', '公演', '体育館', 'ステージ', '感動のステージをお届けします。', 0, 'open', 'distributing', false, '{"instagram": "https://instagram.com"}', 
  '[{"time": "09:30", "end_time": "10:15", "status": "none"}, {"time": "13:30", "end_time": "14:15", "status": "none"}]',
  '[{"time": "10:00", "end_time": "10:45", "status": "none"}]'),
('WIND', 'pw-wind', '吹奏楽部', 'Summer Concert', '公演', '体育館', 'ステージ', '迫力ある演奏をお楽しみください。', 0, 'open', 'distributing', false, '{}', 
  '[{"time": "11:00", "end_time": "11:45", "status": "none"}, {"time": "15:00", "end_time": "15:45", "status": "none"}]',
  '[{"time": "11:15", "end_time": "11:55", "status": "none"}]'),
('DANCE', 'pw-dance', 'ダンス同好会', 'STREET VIBES', '公演', '体育館', 'ステージ', '熱いダンスパフォーマンス！', 0, 'open', 'distributing', false, '{}', 
  '[{"time": "10:30", "end_time": "11:00", "status": "none"}]',
  '[{"time": "09:15", "end_time": "09:45", "status": "none"}]'),

-- === 展示部門 ===
('ART', 'pw-art', '美術部', '凌雲展', '展示', '南館', '美術室', '部員の力作を展示しています。', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('SCI', 'pw-sci', '科学部', 'サイエンスラボ', '展示', '南館', '地学室', '面白い実験を実演中！', 0, 'open', 'distributing', false, '{}', '[]', '[]'),
('CALLI', 'pw-calli', '書道部', '墨の香', '展示', '南館', '書道室', '書道パフォーマンスの作品も展示中。', 0, 'open', 'distributing', false, '{}', '[]', '[]'),

-- === 冊子部門 ===
('BOOK', 'pw-book', '文化委員会', '公式パンフレット配布', '冊子', '各所', '受付', 'たちばな祭の公式パンフレットを配布しています。', 0, 'open', 'distributing', false, '{}', '[]', '[]');

-- 結果の確認
SELECT login_id, name, department, building, room FROM groups ORDER BY department, login_id;
