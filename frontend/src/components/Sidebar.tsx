import { useState } from "react";
import type { Project, User } from "../types.ts";

interface Props {
  projects: Project[];
  selectedProject: Project | null;
  currentUser: User;
  onSelectProject: (project: Project) => void;
  onAddProject: () => void;
  onLogout: () => void;
}

export default function Sidebar({ projects, selectedProject, currentUser, onSelectProject, onAddProject, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-12 bg-brand-900 text-white flex flex-col items-center pt-4 shrink-0">
        <button onClick={() => setCollapsed(false)} className="text-brand-300 hover:text-white p-2" title="メニューを開く">
          ☰
        </button>
      </div>
    );
  }

  return (
    <div className="w-60 bg-brand-900 text-white flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-800">
        <h1 className="text-lg font-bold text-brand-300">TaskBoard</h1>
        <button onClick={() => setCollapsed(true)} className="text-brand-400 hover:text-white text-sm">✕</button>
      </div>

      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-brand-400 uppercase tracking-wider">プロジェクト</span>
        <button onClick={onAddProject} className="text-brand-400 hover:text-brand-300 text-lg leading-none" title="プロジェクト追加">＋</button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectProject(p)}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
              selectedProject?.id === p.id
                ? "bg-brand-800 text-white"
                : "text-brand-200 hover:bg-brand-800/50 hover:text-white"
            }`}
          >
            <span className="font-mono text-xs text-brand-500 mr-2">{p.project_key}</span>
            {p.name}
          </button>
        ))}
        {projects.length === 0 && (
          <p className="text-brand-500 text-sm px-4 py-4">プロジェクトがありません</p>
        )}
      </nav>

      <div className="border-t border-brand-800 px-4 py-3">
        <p className="text-xs text-brand-300 truncate">{currentUser.name}</p>
        <button
          onClick={onLogout}
          className="text-xs text-brand-500 hover:text-brand-300 mt-1"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
