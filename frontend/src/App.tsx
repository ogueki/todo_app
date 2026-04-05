import { useState, useEffect, useCallback } from "react";
import type { Project, Issue, User } from "./types.ts";
import * as api from "./api.ts";
import Sidebar from "./components/Sidebar.tsx";
import IssueTable from "./components/IssueTable.tsx";
import KanbanBoard from "./components/KanbanBoard.tsx";
import IssueModal from "./components/IssueModal.tsx";
import IssueDetailPage from "./components/IssueDetailPage.tsx";
import ProjectModal from "./components/ProjectModal.tsx";
import FilterBar, { defaultFilters } from "./components/FilterBar.tsx";
import type { Filters } from "./components/FilterBar.tsx";
import LoginPage from "./components/LoginPage.tsx";
import SignupPage from "./components/SignupPage.tsx";

type ViewMode = "list" | "board";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authPage, setAuthPage] = useState<"login" | "signup">("login");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  // モーダル（新規作成用）
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [newIssueParentId, setNewIssueParentId] = useState<number | null>(null);

  // 課題詳細画面
  const [viewingIssue, setViewingIssue] = useState<Issue | null>(null);

  // 認証チェック
  useEffect(() => {
    if (api.getToken()) {
      api.fetchMe()
        .then(setCurrentUser)
        .catch(() => api.clearToken())
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    api.setToken(token);
    setCurrentUser(user);
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    const { token, user } = await api.signup(name, email, password);
    api.setToken(token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    api.clearToken();
    setCurrentUser(null);
    setProjects([]);
    setSelectedProject(null);
    setIssues([]);
  };

  // 初期データ読み込み
  useEffect(() => {
    if (!currentUser) return;
    api.fetchUsers().then(setUsers);
    api.fetchProjects().then((ps) => {
      setProjects(ps);
      if (ps.length > 0) setSelectedProject(ps[0]);
    });
  }, [currentUser]);

  // 課題読み込み
  const loadIssues = useCallback(() => {
    if (!selectedProject) return;
    const params: Record<string, string> = {};
    if (filters.status.length) params.status = filters.status.join(",");
    if (filters.priority.length) params.priority = filters.priority.join(",");
    if (filters.type.length) params.type = filters.type.join(",");
    if (filters.assignee.length) params.assignee = filters.assignee.join(",");
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.sort) params.sort = filters.sort;
    api.fetchIssues(selectedProject.id, params).then((loadedIssues) => {
      setIssues(loadedIssues);
      // 詳細画面を開いている場合、最新データで更新
      if (viewingIssue) {
        const updated = loadedIssues.find((i) => i.id === viewingIssue.id);
        if (updated) setViewingIssue(updated);
      }
    });
  }, [selectedProject, filters, viewingIssue]);

  useEffect(() => {
    loadIssues();
  }, [selectedProject, filters]);

  // --- プロジェクト操作 ---
  const handleSaveProject = async (data: { project_key: string; name: string; description: string }) => {
    if (editingProject) {
      const updated = await api.updateProject(editingProject.id, data);
      setProjects((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
      if (selectedProject?.id === updated.id) setSelectedProject(updated);
    } else {
      const created = await api.createProject(data);
      setProjects((ps) => [...ps, created]);
      setSelectedProject(created);
    }
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleDeleteProject = async () => {
    if (!editingProject || !confirm(`「${editingProject.name}」を削除しますか？`)) return;
    await api.deleteProject(editingProject.id);
    setProjects((ps) => ps.filter((p) => p.id !== editingProject.id));
    if (selectedProject?.id === editingProject.id) {
      setSelectedProject(projects.find((p) => p.id !== editingProject.id) || null);
    }
    setShowProjectModal(false);
    setEditingProject(null);
  };

  // --- 課題操作 ---
  const handleCreateIssue = async (data: Partial<Issue>) => {
    if (!selectedProject) return;
    await api.createIssue(selectedProject.id, { ...data, created_by: currentUser!.id });
    loadIssues();
    setShowIssueModal(false);
  };

  const handleStatusChange = async (issueId: number, statusId: number, resolutionId?: number | null) => {
    if (!selectedProject) return;
    await api.updateIssueStatus(selectedProject.id, issueId, statusId, resolutionId);
    loadIssues();
  };

  const openIssue = (issue: Issue) => {
    setViewingIssue(issue);
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  if (!currentUser) {
    if (authPage === "signup") {
      return <SignupPage onSignup={handleSignup} onSwitchToLogin={() => setAuthPage("login")} />;
    }
    return <LoginPage onLogin={handleLogin} onSwitchToSignup={() => setAuthPage("signup")} />;
  }

  return (
    <div className="flex h-screen bg-brand-50">
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        currentUser={currentUser}
        onSelectProject={(p) => {
          setSelectedProject(p);
          setFilters(defaultFilters);
          setViewingIssue(null);
        }}
        onAddProject={() => {
          setEditingProject(null);
          setShowProjectModal(true);
        }}
        onLogout={handleLogout}
        onUserUpdated={(user) => {
          setCurrentUser(user);
          api.fetchUsers().then(setUsers);
        }}
      />

      {/* 課題詳細画面 or 一覧画面 */}
      {viewingIssue && selectedProject ? (
        <IssueDetailPage
          issue={viewingIssue}
          issues={issues}
          users={users}
          currentUserId={currentUser.id}
          projectId={selectedProject.id}
          onBack={() => setViewingIssue(null)}
          onIssueUpdated={loadIssues}
          onIssueDeleted={() => {
            setViewingIssue(null);
            loadIssues();
          }}
          onOpenIssue={openIssue}
          onAddChildIssue={(parentId) => {
            setNewIssueParentId(parentId);
            setShowIssueModal(true);
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {selectedProject ? (
            <>
              {/* ヘッダー */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <h2
                    className="text-xl font-bold cursor-pointer hover:text-brand-500 transition-colors"
                    onClick={() => {
                      setEditingProject(selectedProject);
                      setShowProjectModal(true);
                    }}
                  >
                    {selectedProject.name}
                  </h2>
                  <span className="text-sm text-gray-400 font-mono">{selectedProject.project_key}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* 表示切替 */}
                  <div className="flex border border-gray-300 rounded-md overflow-hidden text-sm">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-3 py-1.5 ${viewMode === "list" ? "bg-brand-400 text-white" : "bg-white text-gray-600 hover:bg-brand-50"}`}
                    >
                      リスト
                    </button>
                    <button
                      onClick={() => setViewMode("board")}
                      className={`px-3 py-1.5 ${viewMode === "board" ? "bg-brand-400 text-white" : "bg-white text-gray-600 hover:bg-brand-50"}`}
                    >
                      ボード
                    </button>
                  </div>
                  <button
                    onClick={() => { setNewIssueParentId(null); setShowIssueModal(true); }}
                    className="px-4 py-1.5 bg-brand-400 text-white text-sm rounded-md hover:bg-brand-500 transition-colors"
                  >
                    課題を追加
                  </button>
                </div>
              </div>

              {/* フィルタ */}
              <FilterBar filters={filters} users={users} onChange={setFilters} />

              {/* コンテンツ */}
              <div className="flex-1 overflow-auto p-4">
                {viewMode === "list" ? (
                  <IssueTable issues={issues} users={users} onClickIssue={openIssue} />
                ) : (
                  <KanbanBoard
                    issues={issues}
                    users={users}
                    onStatusChange={handleStatusChange}
                    onClickIssue={openIssue}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>プロジェクトを選択してください</p>
            </div>
          )}
        </div>
      )}

      {/* モーダル */}
      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onSave={handleSaveProject}
          onDelete={editingProject ? handleDeleteProject : undefined}
          onClose={() => { setShowProjectModal(false); setEditingProject(null); }}
        />
      )}
      {showIssueModal && (
        <IssueModal
          issue={null}
          issues={issues}
          users={users}
          currentUserId={currentUser.id}
          defaultParentIssueId={newIssueParentId}
          onSave={handleCreateIssue}
          onClose={() => { setShowIssueModal(false); setNewIssueParentId(null); }}
        />
      )}
    </div>
  );
}
