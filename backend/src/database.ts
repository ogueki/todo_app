import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "taskboard.db");

const db = new Database(dbPath);

// WALモードで高速化
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
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
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE (project_id, issue_number)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 既存DBにカラム追加（マイグレーション）
  try {
    db.exec("ALTER TABLE issues ADD COLUMN resolution_id INTEGER");
  } catch {
    // カラムが既に存在する場合は無視
  }
  try {
    db.exec("ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT ''");
    db.exec("UPDATE users SET password = 'password' WHERE password = ''");
  } catch {
    // カラムが既に存在する場合は無視
  }
  try {
    db.exec("ALTER TABLE issues ADD COLUMN parent_issue_id INTEGER REFERENCES issues(id) ON DELETE SET NULL");
  } catch {
    // カラムが既に存在する場合は無視
  }

  // シードデータ（テーブルが空の場合のみ）
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    insertUser.run("田中太郎", "tanaka@example.com", "password");
    insertUser.run("佐藤花子", "sato@example.com", "password");
    insertUser.run("鈴木一郎", "suzuki@example.com", "password");

    const insertProject = db.prepare(
      "INSERT INTO projects (project_key, name, description) VALUES (?, ?, ?)"
    );
    insertProject.run("SAMPLE", "サンプルプロジェクト", "TaskBoardの動作確認用プロジェクトです。");

    const project = db.prepare("SELECT id FROM projects WHERE project_key = 'SAMPLE'").get() as { id: number };
    const insertIssue = db.prepare(`
      INSERT INTO issues (project_id, issue_number, subject, description, status_id, priority_id, type_id, assignee_id, created_by, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertIssue.run(project.id, 1, "ログイン画面のデザイン作成", "ログイン画面のモックアップを作成する", 1, 1, 1, 1, 1, "2026-04-15");
    insertIssue.run(project.id, 2, "API認証機能の実装", "JWT認証を使った認証APIを実装する", 2, 1, 1, 2, 1, "2026-04-20");
    insertIssue.run(project.id, 3, "トップページのレイアウト崩れ", "Safariでヘッダーが重なる不具合", 3, 2, 2, 1, 2, null);
    insertIssue.run(project.id, 4, "利用規約ページの追加", "利用規約とプライバシーポリシーのページを追加", 4, 3, 3, 3, 1, "2026-03-30");
    // 完了課題に完了理由を設定
    db.prepare("UPDATE issues SET resolution_id = 1 WHERE project_id = ? AND issue_number = 4").run(project.id);

    // 親子課題のサンプル: SAMPLE-1 の子課題を2件追加
    const parentIssue = db.prepare("SELECT id FROM issues WHERE project_id = ? AND issue_number = 1").get(project.id) as { id: number };
    insertIssue.run(project.id, 5, "ログイン画面のHTML/CSSコーディング", "モックアップに基づいてコーディング", 1, 1, 1, 1, 1, null);
    insertIssue.run(project.id, 6, "ログインフォームのバリデーション実装", "メール形式チェック、パスワード長チェック", 1, 2, 1, 2, 1, null);
    db.prepare("UPDATE issues SET parent_issue_id = ? WHERE project_id = ? AND issue_number IN (5, 6)").run(parentIssue.id, project.id);
  }
}

export default db;
