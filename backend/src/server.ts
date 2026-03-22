import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import db, { initDatabase } from "./database.js";

const app = express();
const PORT = 3001;
const JWT_SECRET = "taskboard-dev-secret"; // 開発用。本番では環境変数から取得する

app.use(cors());
app.use(express.json());

// --- 認証 ---
interface AuthRequest extends Request {
  user?: { id: number; name: string; email: string };
}

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "メールアドレスとパスワードは必須です" });
    return;
  }
  const user = db.prepare("SELECT id, name, email, password FROM users WHERE email = ?").get(email) as any;
  if (!user || user.password !== password) {
    res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
    return;
  }
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get("/api/auth/me", (req: AuthRequest, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { id: number; name: string; email: string };
    res.json({ id: payload.id, name: payload.name, email: payload.email });
  } catch {
    res.status(401).json({ error: "トークンが無効です" });
  }
});

// 認証ミドルウェア（/api/auth 以外のルートを保護）
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.path.startsWith("/api/auth")) return next();
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { id: number; name: string; email: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "トークンが無効です" });
  }
}
app.use(authMiddleware);

// --- ユーザー ---
app.get("/api/users", (_req, res) => {
  const users = db.prepare("SELECT id, name, email, created_at FROM users ORDER BY id").all();
  res.json(users);
});

// --- プロジェクト ---
app.get("/api/projects", (_req, res) => {
  const projects = db.prepare("SELECT * FROM projects ORDER BY id").all();
  res.json(projects);
});

app.post("/api/projects", (req, res) => {
  const { project_key, name, description } = req.body;
  if (!project_key || !name) {
    res.status(400).json({ error: "project_key と name は必須です" });
    return;
  }
  if (!/^[A-Z]{2,10}$/.test(project_key)) {
    res.status(400).json({ error: "project_key は英大文字2〜10文字で指定してください" });
    return;
  }
  try {
    const result = db.prepare(
      "INSERT INTO projects (project_key, name, description) VALUES (?, ?, ?)"
    ).run(project_key, name, description || "");
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(project);
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ error: "そのプロジェクトキーは既に使用されています" });
      return;
    }
    throw e;
  }
});

app.get("/api/projects/:id", (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "プロジェクトが見つかりません" });
    return;
  }
  res.json(project);
});

app.put("/api/projects/:id", (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: "name は必須です" });
    return;
  }
  const result = db.prepare(
    "UPDATE projects SET name = ?, description = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
  ).run(name, description || "", req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "プロジェクトが見つかりません" });
    return;
  }
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  res.json(project);
});

app.delete("/api/projects/:id", (req, res) => {
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "プロジェクトが見つかりません" });
    return;
  }
  res.status(204).end();
});

// --- 課題 ---
app.get("/api/projects/:projectId/issues", (req, res) => {
  const { projectId } = req.params;
  const { status, priority, type, assignee, keyword, sort } = req.query;

  let sql = `
    SELECT i.*, p.project_key,
           (p.project_key || '-' || i.issue_number) as issue_key
    FROM issues i
    JOIN projects p ON p.id = i.project_id
    WHERE i.project_id = ?
  `;
  const params: any[] = [projectId];

  if (status) {
    const ids = (status as string).split(",").map(Number);
    sql += ` AND i.status_id IN (${ids.map(() => "?").join(",")})`;
    params.push(...ids);
  }
  if (priority) {
    const ids = (priority as string).split(",").map(Number);
    sql += ` AND i.priority_id IN (${ids.map(() => "?").join(",")})`;
    params.push(...ids);
  }
  if (type) {
    const ids = (type as string).split(",").map(Number);
    sql += ` AND i.type_id IN (${ids.map(() => "?").join(",")})`;
    params.push(...ids);
  }
  if (assignee) {
    const ids = (assignee as string).split(",").map(Number);
    sql += ` AND i.assignee_id IN (${ids.map(() => "?").join(",")})`;
    params.push(...ids);
  }
  if (keyword) {
    sql += ` AND i.subject LIKE ?`;
    params.push(`%${keyword}%`);
  }

  const sortMap: Record<string, string> = {
    created: "i.created_at DESC",
    updated: "i.updated_at DESC",
    priority: "i.priority_id ASC",
    due: "i.due_date ASC NULLS LAST",
  };
  sql += ` ORDER BY ${sortMap[sort as string] || "i.id DESC"}`;

  const issues = db.prepare(sql).all(...params);
  res.json(issues);
});

app.post("/api/projects/:projectId/issues", (req, res) => {
  const { projectId } = req.params;
  const { subject, description, status_id, priority_id, type_id, assignee_id, created_by, start_date, due_date, resolution_id } = req.body;

  if (!subject) {
    res.status(400).json({ error: "subject は必須です" });
    return;
  }
  if (start_date && due_date && start_date > due_date) {
    res.status(400).json({ error: "開始日は期限日以前にしてください" });
    return;
  }

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    res.status(404).json({ error: "プロジェクトが見つかりません" });
    return;
  }

  // 次の課題番号を取得
  const maxNum = db.prepare(
    "SELECT COALESCE(MAX(issue_number), 0) as max_num FROM issues WHERE project_id = ?"
  ).get(projectId) as { max_num: number };
  const issueNumber = maxNum.max_num + 1;

  const result = db.prepare(`
    INSERT INTO issues (project_id, issue_number, subject, description, status_id, priority_id, type_id, assignee_id, created_by, start_date, due_date, resolution_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId, issueNumber, subject, description || "",
    status_id || 1, priority_id || 2, type_id || 1,
    assignee_id || null, created_by || 1,
    start_date || null, due_date || null,
    (status_id || 1) === 4 ? (resolution_id || null) : null
  );

  const issue = db.prepare(`
    SELECT i.*, p.project_key, (p.project_key || '-' || i.issue_number) as issue_key
    FROM issues i JOIN projects p ON p.id = i.project_id
    WHERE i.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(issue);
});

app.get("/api/projects/:projectId/issues/:issueId", (req, res) => {
  const issue = db.prepare(`
    SELECT i.*, p.project_key, (p.project_key || '-' || i.issue_number) as issue_key
    FROM issues i JOIN projects p ON p.id = i.project_id
    WHERE i.id = ? AND i.project_id = ?
  `).get(req.params.issueId, req.params.projectId);
  if (!issue) {
    res.status(404).json({ error: "課題が見つかりません" });
    return;
  }
  res.json(issue);
});

app.put("/api/projects/:projectId/issues/:issueId", (req, res) => {
  const { subject, description, status_id, priority_id, type_id, assignee_id, start_date, due_date, resolution_id } = req.body;
  if (!subject) {
    res.status(400).json({ error: "subject は必須です" });
    return;
  }
  if (start_date && due_date && start_date > due_date) {
    res.status(400).json({ error: "開始日は期限日以前にしてください" });
    return;
  }

  const effectiveResolution = (status_id || 1) === 4 ? (resolution_id || null) : null;

  const result = db.prepare(`
    UPDATE issues SET subject = ?, description = ?, status_id = ?, priority_id = ?, type_id = ?,
    assignee_id = ?, start_date = ?, due_date = ?, resolution_id = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ? AND project_id = ?
  `).run(
    subject, description || "", status_id || 1, priority_id || 2, type_id || 1,
    assignee_id || null, start_date || null, due_date || null, effectiveResolution,
    req.params.issueId, req.params.projectId
  );
  if (result.changes === 0) {
    res.status(404).json({ error: "課題が見つかりません" });
    return;
  }
  const issue = db.prepare(`
    SELECT i.*, p.project_key, (p.project_key || '-' || i.issue_number) as issue_key
    FROM issues i JOIN projects p ON p.id = i.project_id
    WHERE i.id = ?
  `).get(req.params.issueId);
  res.json(issue);
});

app.delete("/api/projects/:projectId/issues/:issueId", (req, res) => {
  const result = db.prepare(
    "DELETE FROM issues WHERE id = ? AND project_id = ?"
  ).run(req.params.issueId, req.params.projectId);
  if (result.changes === 0) {
    res.status(404).json({ error: "課題が見つかりません" });
    return;
  }
  res.status(204).end();
});

app.patch("/api/projects/:projectId/issues/:issueId/status", (req, res) => {
  const { status_id } = req.body;
  if (!status_id || status_id < 1 || status_id > 4) {
    res.status(400).json({ error: "status_id は 1〜4 で指定してください" });
    return;
  }
  const result = db.prepare(
    "UPDATE issues SET status_id = ?, updated_at = datetime('now', 'localtime') WHERE id = ? AND project_id = ?"
  ).run(status_id, req.params.issueId, req.params.projectId);
  if (result.changes === 0) {
    res.status(404).json({ error: "課題が見つかりません" });
    return;
  }
  const issue = db.prepare(`
    SELECT i.*, p.project_key, (p.project_key || '-' || i.issue_number) as issue_key
    FROM issues i JOIN projects p ON p.id = i.project_id
    WHERE i.id = ?
  `).get(req.params.issueId);
  res.json(issue);
});

// --- コメント ---
app.get("/api/issues/:issueId/comments", (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.issue_id = ?
    ORDER BY c.created_at DESC
  `).all(req.params.issueId);
  res.json(comments);
});

app.post("/api/issues/:issueId/comments", (req, res) => {
  const { content, user_id } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ error: "コメント内容は必須です" });
    return;
  }
  const issue = db.prepare("SELECT id FROM issues WHERE id = ?").get(req.params.issueId);
  if (!issue) {
    res.status(404).json({ error: "課題が見つかりません" });
    return;
  }
  const result = db.prepare(
    "INSERT INTO comments (issue_id, user_id, content) VALUES (?, ?, ?)"
  ).run(req.params.issueId, user_id || 1, content.trim());
  const comment = db.prepare(`
    SELECT c.*, u.name as user_name
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(comment);
});

app.delete("/api/comments/:commentId", (req, res) => {
  const result = db.prepare("DELETE FROM comments WHERE id = ?").run(req.params.commentId);
  if (result.changes === 0) {
    res.status(404).json({ error: "コメントが見つかりません" });
    return;
  }
  res.status(204).end();
});

// --- サーバー起動 ---
initDatabase();
app.listen(PORT, () => {
  console.log(`TaskBoard API サーバー起動: http://localhost:${PORT}`);
});
