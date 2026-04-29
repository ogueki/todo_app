-- 全テーブルで RLS を有効化（ポリシー無し = PostgREST(anon/authenticated)から全ブロック）
-- Supabase ダッシュボード SQL Editor で実行
--
-- 経緯:
--   Supabase は public スキーマのテーブルを PostgREST で自動公開する。
--   RLS が無効だと anon キーで直接読み書きされるため、ロックする。
--   バックエンドは DATABASE_URL で postgres ロール接続しており BYPASSRLS のため影響なし。

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
