export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  project_key: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: number;
  project_id: number;
  issue_number: number;
  issue_key: string;
  project_key: string;
  subject: string;
  description: string;
  status_id: number;
  priority_id: number;
  type_id: number;
  assignee_id: number | null;
  created_by: number;
  start_date: string | null;
  due_date: string | null;
  resolution_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  issue_id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
}

export const STATUSES = [
  { id: 1, name: "未対応", color: "#9ca3af", bg: "#f3f4f6" },
  { id: 2, name: "処理中", color: "#3b82f6", bg: "#eff6ff" },
  { id: 3, name: "処理済み", color: "#f97316", bg: "#fff7ed" },
  { id: 4, name: "完了", color: "#22c55e", bg: "#f0fdf4" },
] as const;

export const PRIORITIES = [
  { id: 1, name: "高", color: "#ef4444" },
  { id: 2, name: "中", color: "#f97316" },
  { id: 3, name: "低", color: "#9ca3af" },
] as const;

export const TYPES = [
  { id: 1, name: "タスク" },
  { id: 2, name: "バグ" },
  { id: 3, name: "要望" },
  { id: 4, name: "その他" },
] as const;

export const RESOLUTIONS = [
  { id: 1, name: "対応済み" },
  { id: 2, name: "対応しない" },
  { id: 3, name: "重複" },
  { id: 4, name: "再現しない" },
  { id: 5, name: "仕様通り" },
] as const;
