import type { User, Project, Issue, Comment } from "./types.ts";

const BASE = "/api";

// トークン管理
export function getToken(): string | null {
  return localStorage.getItem("token");
}
export function setToken(token: string): void {
  localStorage.setItem("token", token);
}
export function clearToken(): void {
  localStorage.removeItem("token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });
  if (res.status === 401 && !path.startsWith("/auth")) {
    clearToken();
    window.location.reload();
    throw new Error("認証が切れました");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "エラーが発生しました" }));
    throw new Error(err.error);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// 認証
export const login = (email: string, password: string) =>
  request<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const fetchMe = () => request<User>("/auth/me");

// ユーザー
export const fetchUsers = () => request<User[]>("/users");

// プロジェクト
export const fetchProjects = () => request<Project[]>("/projects");
export const createProject = (data: { project_key: string; name: string; description?: string }) =>
  request<Project>("/projects", { method: "POST", body: JSON.stringify(data) });
export const updateProject = (id: number, data: { name: string; description?: string }) =>
  request<Project>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProject = (id: number) =>
  request<void>(`/projects/${id}`, { method: "DELETE" });

// 課題
export const fetchIssues = (projectId: number, params?: Record<string, string>) => {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<Issue[]>(`/projects/${projectId}/issues${query}`);
};
export const createIssue = (projectId: number, data: Partial<Issue>) =>
  request<Issue>(`/projects/${projectId}/issues`, { method: "POST", body: JSON.stringify(data) });
export const updateIssue = (projectId: number, issueId: number, data: Partial<Issue>) =>
  request<Issue>(`/projects/${projectId}/issues/${issueId}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteIssue = (projectId: number, issueId: number) =>
  request<void>(`/projects/${projectId}/issues/${issueId}`, { method: "DELETE" });
export const updateIssueStatus = (projectId: number, issueId: number, statusId: number) =>
  request<Issue>(`/projects/${projectId}/issues/${issueId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status_id: statusId }),
  });

// コメント
export const fetchComments = (issueId: number) =>
  request<Comment[]>(`/issues/${issueId}/comments`);
export const createComment = (issueId: number, data: { content: string; user_id: number }) =>
  request<Comment>(`/issues/${issueId}/comments`, { method: "POST", body: JSON.stringify(data) });
export const deleteComment = (commentId: number) =>
  request<void>(`/comments/${commentId}`, { method: "DELETE" });
