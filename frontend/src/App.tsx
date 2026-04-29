import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import type { Project, Issue, User, UserSummary } from "./types.ts";
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
import MobileMenuButton from "./components/MobileMenuButton.tsx";
import { NotificationProvider } from "./NotificationContext.tsx";

type ViewMode = "list" | "board";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
    navigate("/", { replace: true });
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    const { token, user } = await api.signup(name, email, password);
    api.setToken(token);
    setCurrentUser(user);
    navigate("/", { replace: true });
  };

  const handleLogout = () => {
    api.clearToken();
    setCurrentUser(null);
    navigate("/login", { replace: true });
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  // 未認証: /login と /signup のみ受け付け、他は /login にリダイレクト
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} onSwitchToSignup={() => navigate("/signup")} />} />
        <Route path="/signup" element={<SignupPage onSignup={handleSignup} onSwitchToLogin={() => navigate("/login")} />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
      </Routes>
    );
  }

  // 認証済み
  return (
    <NotificationProvider>
      <AuthenticatedApp
        currentUser={currentUser}
        onLogout={handleLogout}
        onUserUpdated={setCurrentUser}
      />
    </NotificationProvider>
  );
}

interface AuthenticatedAppProps {
  currentUser: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}

function AuthenticatedApp({ currentUser, onLogout, onUserUpdated }: AuthenticatedAppProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [users, setUsers] = useState<UserSummary[]>([]);

  // 初期データ読み込み
  useEffect(() => {
    api.fetchUsers().then(setUsers);
    api.fetchProjects().then((ps) => {
      setProjects(ps);
      setProjectsLoaded(true);
    });
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/signup"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/"
        element={
          projectsLoaded ? (
            projects.length > 0 ? (
              <Navigate to={`/projects/${projects[0].project_key}`} replace />
            ) : (
              <EmptyShell
                currentUser={currentUser}
                projects={projects}
                users={users}
                setUsers={setUsers}
                setProjects={setProjects}
                onLogout={onLogout}
                onUserUpdated={onUserUpdated}
              />
            )
          ) : (
            <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>
          )
        }
      />
      <Route
        path="/projects/:projectKey"
        element={
          <ProjectShell
            currentUser={currentUser}
            projects={projects}
            users={users}
            projectsLoaded={projectsLoaded}
            setProjects={setProjects}
            setUsers={setUsers}
            onLogout={onLogout}
            onUserUpdated={onUserUpdated}
          />
        }
      />
      <Route
        path="/projects/:projectKey/issues/:issueKey"
        element={
          <ProjectShell
            currentUser={currentUser}
            projects={projects}
            users={users}
            projectsLoaded={projectsLoaded}
            setProjects={setProjects}
            setUsers={setUsers}
            onLogout={onLogout}
            onUserUpdated={onUserUpdated}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

interface ShellProps {
  currentUser: User;
  projects: Project[];
  users: UserSummary[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setUsers: React.Dispatch<React.SetStateAction<UserSummary[]>>;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}

type EmptyShellProps = ShellProps;

function EmptyShell({ currentUser, projects, setProjects, setUsers, onLogout, onUserUpdated }: EmptyShellProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const handleSaveProject = async (data: { project_key: string; name: string; description: string }) => {
    const created = await api.createProject(data);
    setProjects((ps) => [...ps, created]);
    setShowProjectModal(false);
    navigate(`/projects/${created.project_key}`);
  };

  return (
    <div className="flex min-h-dvh md:h-dvh bg-brand-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          projects={projects}
          selectedProject={null}
          currentUser={currentUser}
          onSelectProject={(p) => {
            navigate(`/projects/${p.project_key}`);
            setSidebarOpen(false);
          }}
          onAddProject={() => {
            setShowProjectModal(true);
            setSidebarOpen(false);
          }}
          onLogout={onLogout}
          onUserUpdated={(user) => {
            onUserUpdated(user);
            api.fetchUsers().then(setUsers);
          }}
          onOpenNotificationIssue={(projectKey, issueKey) => {
            navigate(`/projects/${projectKey}/issues/${issueKey}`);
            setSidebarOpen(false);
          }}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-white">
          <MobileMenuButton onClick={() => setSidebarOpen(true)} />
          <h2 className="text-lg md:text-xl font-bold">プロジェクト</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 px-4">
          <p>プロジェクトがありません</p>
          <button
            onClick={() => setShowProjectModal(true)}
            className="px-4 py-2 bg-brand-400 text-white text-sm rounded-md hover:bg-brand-500 transition-colors"
          >
            プロジェクトを作成
          </button>
        </div>
      </div>

      {showProjectModal && (
        <ProjectModal
          project={null}
          onSave={handleSaveProject}
          onClose={() => setShowProjectModal(false)}
        />
      )}
    </div>
  );
}

interface ProjectShellProps extends ShellProps {
  projectsLoaded: boolean;
}

function ProjectShell({ currentUser, projects, users, projectsLoaded, setProjects, setUsers, onLogout, onUserUpdated }: ProjectShellProps) {
  const { projectKey, issueKey } = useParams<{ projectKey: string; issueKey?: string }>();
  const navigate = useNavigate();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // モーダル
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [newIssueParentId, setNewIssueParentId] = useState<number | null>(null);

  // URL の projectKey から selectedProject を解決
  const selectedProject = projects.find((p) => p.project_key === projectKey) ?? null;

  // URL の issueKey から viewingIssue を解決
  const viewingIssue = issueKey ? issues.find((i) => i.issue_key === issueKey) ?? null : null;

  // プロジェクト切替時にフィルタリセット
  useEffect(() => {
    setFilters(defaultFilters);
  }, [projectKey]);

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
    api.fetchIssues(selectedProject.id, params).then(setIssues);
  }, [selectedProject, filters]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // プロジェクトが読込み済みで、URLのキーに該当しなければホームへ
  useEffect(() => {
    if (projectsLoaded && !selectedProject) {
      navigate("/", { replace: true });
    }
  }, [projectsLoaded, selectedProject, navigate]);

  // --- プロジェクト操作 ---
  const handleSaveProject = async (data: { project_key: string; name: string; description: string }) => {
    if (editingProject) {
      const updated = await api.updateProject(editingProject.id, data);
      setProjects((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
      if (selectedProject?.id === updated.id && updated.project_key !== projectKey) {
        navigate(`/projects/${updated.project_key}`, { replace: true });
      }
    } else {
      const created = await api.createProject(data);
      setProjects((ps) => [...ps, created]);
      navigate(`/projects/${created.project_key}`);
    }
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleDeleteProject = async () => {
    if (!editingProject || !confirm(`「${editingProject.name}」を削除しますか？`)) return;
    await api.deleteProject(editingProject.id);
    setProjects((ps) => ps.filter((p) => p.id !== editingProject.id));
    setShowProjectModal(false);
    setEditingProject(null);
    navigate("/", { replace: true });
  };

  // --- 課題操作 ---
  const handleCreateIssue = async (data: Partial<Issue>) => {
    if (!selectedProject) return;
    await api.createIssue(selectedProject.id, data);
    loadIssues();
    setShowIssueModal(false);
  };

  const handleStatusChange = async (issueId: number, statusId: number, resolutionId?: number | null) => {
    if (!selectedProject) return;
    await api.updateIssueStatus(selectedProject.id, issueId, statusId, resolutionId);
    loadIssues();
  };

  const openIssue = (issue: Issue) => {
    if (!selectedProject) return;
    navigate(`/projects/${selectedProject.project_key}/issues/${issue.issue_key}`);
  };

  const goBackToList = () => {
    if (!selectedProject) return;
    navigate(`/projects/${selectedProject.project_key}`);
  };

  // 通知から課題ジャンプ（project_key/issue_key 直接）
  const openIssueFromNotification = (pKey: string, iKey: string) => {
    navigate(`/projects/${pKey}/issues/${iKey}`);
    setSidebarOpen(false);
  };

  if (!projectsLoaded) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }
  if (!selectedProject) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">プロジェクトが見つかりません</div>;
  }

  return (
    <div className="flex min-h-dvh md:h-dvh bg-brand-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          projects={projects}
          selectedProject={selectedProject}
          currentUser={currentUser}
          onSelectProject={(p) => {
            navigate(`/projects/${p.project_key}`);
            setSidebarOpen(false);
          }}
          onAddProject={() => {
            setEditingProject(null);
            setShowProjectModal(true);
            setSidebarOpen(false);
          }}
          onLogout={onLogout}
          onUserUpdated={(user) => {
            onUserUpdated(user);
            api.fetchUsers().then(setUsers);
          }}
          onOpenNotificationIssue={openIssueFromNotification}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </div>

      {issueKey ? (
        viewingIssue ? (
          <IssueDetailPage
            issue={viewingIssue}
            issues={issues}
            users={users}
            currentUserId={currentUser.id}
            projectId={selectedProject.id}
            onBack={goBackToList}
            onIssueUpdated={loadIssues}
            onIssueDeleted={() => {
              loadIssues();
              goBackToList();
            }}
            onOpenIssue={openIssue}
            onAddChildIssue={(parentId) => {
              setNewIssueParentId(parentId);
              setShowIssueModal(true);
            }}
            onOpenMenu={() => setSidebarOpen(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-gray-200 bg-white">
              <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-400">読み込み中...</div>
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* ヘッダー */}
          <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-white flex-wrap">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <MobileMenuButton onClick={() => setSidebarOpen(true)} />
              <h2
                className="text-lg md:text-xl font-bold cursor-pointer hover:text-brand-500 transition-colors truncate"
                onClick={() => {
                  setEditingProject(selectedProject);
                  setShowProjectModal(true);
                }}
              >
                {selectedProject.name}
              </h2>
              <span className="text-xs md:text-sm text-gray-400 font-mono shrink-0">{selectedProject.project_key}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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

          <FilterBar filters={filters} users={users} onChange={setFilters} />

          {viewMode === "list" ? (
            <div className="flex-1 p-4 md:overflow-auto">
              <IssueTable issues={issues} users={users} onClickIssue={openIssue} />
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-auto">
              <KanbanBoard
                issues={issues}
                users={users}
                onStatusChange={handleStatusChange}
                onClickIssue={openIssue}
              />
            </div>
          )}
        </div>
      )}

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
          defaultParentIssueId={newIssueParentId}
          onSave={handleCreateIssue}
          onClose={() => { setShowIssueModal(false); setNewIssueParentId(null); }}
        />
      )}
    </div>
  );
}
