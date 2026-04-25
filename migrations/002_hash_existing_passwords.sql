-- 既存ユーザーのパスワードをbcryptハッシュ化する一回限りの移行
-- Supabase ダッシュボード SQL Editor で実行
--
-- 適用対象:
--   シード3ユーザー (tanaka / sato / suzuki) は元パスワード "password" のままハッシュ化
--   サインアップした自分のアカウントは別途差し替えること（最下部のテンプレ参照）

UPDATE users
SET password = '$2b$10$GIQ1Pd/WvPgY0pd81YCHFe6tr1x9GlNKOd0O.QNlofve9270RRB/y'
WHERE email IN ('tanaka@example.com', 'sato@example.com', 'suzuki@example.com');

-- 自分のサインアップアカウント (shinya19970712@gmail.com)
UPDATE users
SET password = '$2b$10$NPCGfTfPfeW2p85pbthkDu7RboYGLp8YSRM8K3df7Mb6cHOWWXt2a'
WHERE email = 'shinya19970712@gmail.com';
