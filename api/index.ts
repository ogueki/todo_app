import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import path from "path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

// --- DB ---
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});
const db = {
  async query(sql: string, params?: any[]) { const { rows } = await pool.query(sql, params); return rows; },
  async queryOne(sql: string, params?: any[]) { const { rows } = await pool.query(sql, params); return rows[0]; },
  async run(sql: string, params?: any[]) { const { rowCount } = await pool.query(sql, params); return { rowCount: rowCount ?? 0 }; },
};

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "taskboard-dev-secret";
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");

app.use(cors());
app.use(express.json({ limit: "4mb" }));

// --- ヘルスチェック ---
app.get("/api/health", async (_req: any, res: any) => {
  try {
    const result = await db.queryOne("SELECT NOW() as now");
    res.json({ status: "ok", db: "connected", timestamp: result?.now });
  } catch (e: any) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

// --- 認証 ---
app.post("/api/auth/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: "メールアドレスとパスワードは必須です" }); return; }
    const user = await db.queryOne("SELECT id, name, email, password, avatar_url FROM users WHERE email = $1", [email]);
    if (!user || user.password !== password) { res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" }); return; }
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } });
  } catch (e: any) { console.error(e); res.status(500).json({ error: "サーバーエラー" }); }
});

app.get("/api/auth/me", async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "認証が必要です" }); return; }
    const payload: any = jwt.verify(authHeader.slice(7), JWT_SECRET);
    const user = await db.queryOne("SELECT id, name, email, avatar_url FROM users WHERE id = $1", [payload.id]);
    if (!user) { res.status(401).json({ error: "ユーザーが見つかりません" }); return; }
    res.json(user);
  } catch { res.status(401).json({ error: "トークンが無効です" }); }
});

// 認証ミドルウェア
app.use((req: any, res: any, next: any) => {
  if (req.path.startsWith("/api/auth") || req.path === "/api/health") return next();
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "認証が必要です" }); return; }
  try { req.user = jwt.verify(authHeader.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "トークンが無効です" }); }
});

// --- ユーザー ---
app.get("/api/users", async (_req: any, res: any) => {
  try { res.json(await db.query("SELECT id, name, email, avatar_url, created_at FROM users ORDER BY id")); }
  catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

// --- アバター ---
app.post("/api/avatars/upload", async (req: any, res: any) => {
  try {
    const { filename: originalName, mimetype, data } = req.body;
    if (!data || !mimetype) { res.status(400).json({ error: "ファイルが指定されていません" }); return; }
    if (!["image/png", "image/jpeg", "image/gif"].includes(mimetype)) { res.status(400).json({ error: "png, jpg, gif のみアップロード可能です" }); return; }
    const buffer = Buffer.from(data, "base64");
    if (buffer.length > 2 * 1024 * 1024) { res.status(400).json({ error: "ファイルサイズは2MB以下にしてください" }); return; }
    const ext = path.extname(originalName || ".png").toLowerCase();
    const storageName = `${req.user.id}${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(storageName, buffer, { contentType: mimetype, upsert: true });
    if (error) { res.status(500).json({ error: "アップロードに失敗しました" }); return; }
    const user = await db.queryOne("UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, name, email, avatar_url", [storageName, req.user.id]);
    res.json(user);
  } catch (e: any) { console.error(e); res.status(500).json({ error: "サーバーエラー" }); }
});

// --- プロジェクト ---
app.get("/api/projects", async (_req: any, res: any) => {
  try { res.json(await db.query("SELECT * FROM projects ORDER BY id")); }
  catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

app.post("/api/projects", async (req: any, res: any) => {
  try {
    const { project_key, name, description } = req.body;
    if (!project_key || !name) { res.status(400).json({ error: "project_key と name は必須です" }); return; }
    if (!/^[A-Z]{2,10}$/.test(project_key)) { res.status(400).json({ error: "project_key は英大文字2〜10文字で指定してください" }); return; }
    res.status(201).json(await db.queryOne("INSERT INTO projects (project_key, name, description) VALUES ($1, $2, $3) RETURNING *", [project_key, name, description || ""]));
  } catch (e: any) {
    if (e.code === "23505") { res.status(409).json({ error: "そのプロジェクトキーは既に使用されています" }); return; }
    res.status(500).json({ error: "サーバーエラー" });
  }
});

app.get("/api/projects/:id", async (req: any, res: any) => {
  try {
    const p = await db.queryOne("SELECT * FROM projects WHERE id = $1", [req.params.id]);
    if (!p) { res.status(404).json({ error: "プロジェクトが見つかりません" }); return; }
    res.json(p);
  } catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

app.put("/api/projects/:id", async (req: any, res: any) => {
  try {
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ error: "name は必須です" }); return; }
    const p = await db.queryOne("UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *", [name, description || "", req.params.id]);
    if (!p) { res.status(404).json({ error: "プロジェクトが見つかりません" }); return; }
    res.json(p);
  } catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

app.delete("/api/projects/:id", async (req: any, res: any) => {
  try {
    const r = await db.run("DELETE FROM projects WHERE id = $1", [req.params.id]);
    if (r.rowCount === 0) { res.status(404).json({ error: "プロジェクトが見つかりません" }); return; }
    res.status(204).end();
  } catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

// --- 課題 ---
app.get("/api/projects/:projectId/issues", async (req: any, res: any) => {
  try {
    const { projectId } = req.params;
    const { status, priority, type, assignee, keyword, sort } = req.query;
    let sql = `SELECT i.*, p.project_key, (p.project_key || '-' || i.issue_number) as issue_key FROM issues i JOIN projects p ON p.id = i.project_id WHERE i.project_id = $1`;
    const params: any[] = [projectId];
    let pi = 2;
    if (status) { const ids = (status as string).split(",").map(Number); sql += ` AND i.status_id IN (${ids.map(() => `$${pi++}`).join(",")})`; params.push(...ids); }
    if (priority) { const ids = (priority as string).split(",").map(Number); sql += ` AND i.priority_id IN (${ids.map(() => `$${pi++}`).join(",")})`; params.push(...ids); }
    if (type) { const ids = (type as string).split(",").map(Number); sql += ` AND i.type_id IN (${ids.map(() => `$${pi++}`).join(",")})`; params.push(...ids); }
    if (assignee) { const ids = (assignee as string).split(",").map(Number); sql += ` AND i.assignee_id IN (${ids.map(() => `$${pi++}`).join(",")})`; params.push(...ids); }
    if (keyword) { sql += ` AND i.subject LIKE $${pi++}`; params.push(`%${keyword}%`); }
    const sortMap: Record<string, string> = { created: "i.created_at DESC", updated: "i.updated_at DESC", priority: "i.priority_id ASC", due: "i.due_date ASC NULLS LAST" };
    sql += ` ORDER BY ${sortMap[sort as string] || "i.id DESC"}`;
    res.json(await db.query(sql, params));
  } catch (e: any) { console.error(e); res.status(500).json({ error: "サーバーエラー" }); }
});

app.post("/api/projects/:projectId/issues", async (req: any, res: any) => {
  try {
    const { projectId } = req.params;
    const { subject, description, status_id, priority_id, type_id, assignee_id, created_by, start_date, due_date, resolution_id, parent_issue_id } = req.body;
    if (!subject) { res.status(400).json({ error: "subject は必須です" }); return; }
    if (start_date && due_date && start_date > due_date) { res.status(400).json({ error: "開始日は期限日以前にしてください" }); return; }
    const project = await db.queryOne("SELECT id FROM projects WHERE id = $1", [projectId]);
    if (!project) { res.status(404).json({ error: "プロジェクトが見つかりません" }); return; }
    if (parent_issue_id) {
      const parent = await db.queryOne("SELECT id, project_id, parent_issue_id FROM issues WHERE id = $1", [parent_issue_id]);
      if (!parent || parent.project_id !== Number(projectId)) { res.status(400).json({ error: "親課題が同一プロジェクト内に見つかりません" }); return; }
      if (parent.parent_issue_id) { res.status(400).json({ error: "孫課題は作成できません（最大2階層）" }); return; }
    }
    const maxNum = await db.queryOne("SELECT COALESCE(MAX(issue_number), 0) as max_num FROM issues WHERE project_id = $1", [projectId]);
    const issueNumber = (maxNum?.max_num ?? 0) + 1;
    const effectiveResolution = (status_id || 1) === 4 ? (resolution_id || null) : null;
    const issue = await db.queryOne(`
      INSERT INTO issues (project_id, issue_number, subject, description, status_id, priority_id, type_id, assignee_id, created_by, start_date, due_date, resolution_id, parent_issue_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *, (SELECT project_key FROM projects WHERE id = $1) as project_key, ((SELECT project_key FROM projects WHERE id = $1) || '-' || $2) as issue_key
    `, [projectId, issueNumber, subject, description || "", status_id || 1, priority_id || 2, type_id || 1,
        assignee_id || null, created_by || 1, start_date || null, due_date || null, effectiveResolution, parent_issue_id || null]);
    res.status(201).json(issue);
  } catch (e: any) { console.error(e); res.status(500).json({ error: "サーバーエラー" }); }
});

app.get("/api/projects/:projectId/issues/:issueId", async (req: any, res: any) => {
  try {
    const issue = await db.queryOne(`SELECT i.*, p.project_key, (p.project_key || '-' || i.issue_number) as issue_key FROM issues i JOIN projects p ON p.id = i.project_id WHERE i.id = $1 AND i.project_id = $2`, [req.params.issueId, req.params.projectId]);
    if (!issue) { res.status(404).json({ error: "課題が見つかりません" }); return; }
    res.json(issue);
  } catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

app.put("/api/projects/:projectId/issues/:issueId", async (req: any, res: any) => {
  try {
    const { subject, description, status_id, priority_id, type_id, assignee_id, start_date, due_date, resolution_id, parent_issue_id } = req.body;
    if (!subject) { res.status(400).json({ error: "subject は必須です" }); return; }
    if (start_date && due_date && start_date > due_date) { res.status(400).json({ error: "開始日は期限日以前にしてください" }); return; }
    const effectiveParent = parent_issue_id || null;
    if (effectiveParent) {
      const parent = await db.queryOne("SELECT id, project_id, parent_issue_id FROM issues WHERE id = $1", [effectiveParent]);
      if (!parent || parent.project_id !== Number(req.params.projectId)) { res.status(400).json({ error: "親課題が同一プロジェクト内に見つかりません" }); return; }
      if (parent.parent_issue_id) { res.status(400).json({ error: "孫課題は作成できません（最大2階層）" }); return; }
      if (parent.id === Number(req.params.issueId)) { res.status(400).json({ error: "自分自身を親課題にはできません" }); return; }
      const children = await db.query("SELECT id FROM issues WHERE parent_issue_id = $1", [Number(req.params.issueId)]);
      if (children.length > 0) { res.status(400).json({ error: "子課題を持つ課題は他の課題の子にはなれません" }); return; }
    }
    const effectiveResolution = (status_id || 1) === 4 ? (resolution_id || null) : null;
    const issue = await db.queryOne(`
      UPDATE issues SET subject = $1, description = $2, status_id = $3, priority_id = $4, type_id = $5,
      assignee_id = $6, start_date = $7, due_date = $8, resolution_id = $9, parent_issue_id = $10, updated_at = NOW()
      WHERE id = $11 AND project_id = $12
      RETURNING *, (SELECT project_key FROM projects WHERE id = $12) as project_key, ((SELECT project_key FROM projects WHERE id = $12) || '-' || issue_number) as issue_key
    `, [subject, description || "", status_id || 1, priority_id || 2, type_id || 1,
        assignee_id || null, start_date || null, due_date || null, effectiveResolution, effectiveParent,
        req.params.issueId, req.params.projectId]);
    if (!issue) { res.status(404).json({ error: "課題が見つかりません" }); return; }
    res.json(issue);
  } catch (e: any) { console.error(e); res.status(500).json({ error: "サーバーエラー" }); }
});

app.delete("/api/projects/:projectId/issues/:issueId", async (req: any, res: any) => {
  try {
    const r = await db.run("DELETE FROM issues WHERE id = $1 AND project_id = $2", [req.params.issueId, req.params.projectId]);
    if (r.rowCount === 0) { res.status(404).json({ error: "課題が見つかりません" }); return; }
    res.status(204).end();
  } catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

app.patch("/api/projects/:projectId/issues/:issueId/status", async (req: any, res: any) => {
  try {
    const { status_id } = req.body;
    if (!status_id || status_id < 1 || status_id > 4) { res.status(400).json({ error: "status_id は 1〜4 で指定してください" }); return; }
    const issue = await db.queryOne(`UPDATE issues SET status_id = $1, updated_at = NOW() WHERE id = $2 AND project_id = $3
      RETURNING *, (SELECT project_key FROM projects WHERE id = $3) as project_key, ((SELECT project_key FROM projects WHERE id = $3) || '-' || issue_number) as issue_key`,
      [status_id, req.params.issueId, req.params.projectId]);
    if (!issue) { res.status(404).json({ error: "課題が見つかりません" }); return; }
    res.json(issue);
  } catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

// --- コメント ---
app.get("/api/issues/:issueId/comments", async (req: any, res: any) => {
  try {
    res.json(await db.query(`SELECT c.*, u.name as user_name, u.avatar_url as user_avatar_url FROM comments c JOIN users u ON u.id = c.user_id WHERE c.issue_id = $1 ORDER BY c.created_at DESC`, [req.params.issueId]));
  } catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

app.post("/api/issues/:issueId/comments", async (req: any, res: any) => {
  try {
    const { content, user_id } = req.body;
    if (!content || !content.trim()) { res.status(400).json({ error: "コメント内容は必須です" }); return; }
    const issue = await db.queryOne("SELECT id FROM issues WHERE id = $1", [req.params.issueId]);
    if (!issue) { res.status(404).json({ error: "課題が見つかりません" }); return; }
    res.status(201).json(await db.queryOne(`INSERT INTO comments (issue_id, user_id, content) VALUES ($1, $2, $3)
      RETURNING *, (SELECT name FROM users WHERE id = $2) as user_name, (SELECT avatar_url FROM users WHERE id = $2) as user_avatar_url`,
      [req.params.issueId, user_id || 1, content.trim()]));
  } catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

app.delete("/api/comments/:commentId", async (req: any, res: any) => {
  try {
    const r = await db.run("DELETE FROM comments WHERE id = $1", [req.params.commentId]);
    if (r.rowCount === 0) { res.status(404).json({ error: "コメントが見つかりません" }); return; }
    res.status(204).end();
  } catch (e: any) { res.status(500).json({ error: "サーバーエラー" }); }
});

export default app;
