-- TaskBoard Supabase マイグレーション
-- Supabase ダッシュボードの SQL Editor で実行してください

-- ========== テーブル作成 ==========

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  project_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  description TEXT DEFAULT '',
  status_id INTEGER NOT NULL DEFAULT 1,
  priority_id INTEGER NOT NULL DEFAULT 2,
  type_id INTEGER NOT NULL DEFAULT 1,
  assignee_id INTEGER REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  start_date TEXT,
  due_date TEXT,
  parent_issue_id INTEGER REFERENCES issues(id) ON DELETE SET NULL,
  resolution_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, issue_number)
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== シードデータ ==========

INSERT INTO users (name, email, password) VALUES
  ('田中太郎', 'tanaka@example.com', 'password'),
  ('佐藤花子', 'sato@example.com', 'password'),
  ('鈴木一郎', 'suzuki@example.com', 'password');

INSERT INTO projects (project_key, name, description) VALUES
  ('SAMPLE', 'サンプルプロジェクト', 'TaskBoardの動作確認用プロジェクトです。');

-- 課題シードデータ
DO $$
DECLARE
  v_project_id INTEGER;
  v_parent_id INTEGER;
BEGIN
  SELECT id INTO v_project_id FROM projects WHERE project_key = 'SAMPLE';

  INSERT INTO issues (project_id, issue_number, subject, description, status_id, priority_id, type_id, assignee_id, created_by, due_date)
  VALUES (v_project_id, 1, 'ログイン画面のデザイン作成', 'ログイン画面のモックアップを作成する', 1, 1, 1, 1, 1, '2026-04-15');

  INSERT INTO issues (project_id, issue_number, subject, description, status_id, priority_id, type_id, assignee_id, created_by, due_date)
  VALUES (v_project_id, 2, 'API認証機能の実装', 'JWT認証を使った認証APIを実装する', 2, 1, 1, 2, 1, '2026-04-20');

  INSERT INTO issues (project_id, issue_number, subject, description, status_id, priority_id, type_id, assignee_id, created_by, due_date)
  VALUES (v_project_id, 3, 'トップページのレイアウト崩れ', 'Safariでヘッダーが重なる不具合', 3, 2, 2, 1, 2, NULL);

  INSERT INTO issues (project_id, issue_number, subject, description, status_id, priority_id, type_id, assignee_id, created_by, due_date, resolution_id)
  VALUES (v_project_id, 4, '利用規約ページの追加', '利用規約とプライバシーポリシーのページを追加', 4, 3, 3, 3, 1, '2026-03-30', 1);

  -- 親子課題: SAMPLE-1 の子課題
  SELECT id INTO v_parent_id FROM issues WHERE project_id = v_project_id AND issue_number = 1;

  INSERT INTO issues (project_id, issue_number, subject, description, status_id, priority_id, type_id, assignee_id, created_by, parent_issue_id)
  VALUES (v_project_id, 5, 'ログイン画面のHTML/CSSコーディング', 'モックアップに基づいてコーディング', 1, 1, 1, 1, 1, v_parent_id);

  INSERT INTO issues (project_id, issue_number, subject, description, status_id, priority_id, type_id, assignee_id, created_by, parent_issue_id)
  VALUES (v_project_id, 6, 'ログインフォームのバリデーション実装', 'メール形式チェック、パスワード長チェック', 1, 2, 1, 2, 1, v_parent_id);
END $$;
