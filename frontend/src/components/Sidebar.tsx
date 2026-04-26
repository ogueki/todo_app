import { useState, useRef } from "react";
import type { Project, User } from "../types.ts";
import * as api from "../api.ts";
import Avatar from "./Avatar.tsx";
import NotificationBell from "./NotificationBell.tsx";

interface Props {
  projects: Project[];
  selectedProject: Project | null;
  currentUser: User;
  onSelectProject: (project: Project) => void;
  onAddProject: () => void;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
  onOpenNotificationIssue: (projectId: number, issueId: number) => void;
  onCloseMobile?: () => void;
}

export default function Sidebar({ projects, selectedProject, currentUser, onSelectProject, onAddProject, onLogout, onUserUpdated, onOpenNotificationIssue, onCloseMobile }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await api.uploadAvatar(file);
      onUserUpdated(updated);
    } catch (err: any) {
      alert(err.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // collapsed はデスクトップ専用の機能（モバイルではドロワー閉で代替）
  if (collapsed) {
    return (
      <div className="w-12 h-full bg-brand-900 text-white flex flex-col items-center pt-4 shrink-0">
        <button onClick={() => setCollapsed(false)} className="text-brand-300 hover:text-white p-2" title="メニューを開く">
          ☰
        </button>
      </div>
    );
  }

  const handleCloseClick = () => {
    if (onCloseMobile) {
      // モバイル時: ドロワーを閉じる（デスクトップではこのハンドラは呼ばれないので安全）
      // ただしデスクトップでも同じボタンで collapse できるよう、画面幅で分岐
      if (window.matchMedia("(min-width: 768px)").matches) {
        setCollapsed(true);
      } else {
        onCloseMobile();
      }
    } else {
      setCollapsed(true);
    }
  };

  return (
    <div className="w-72 max-w-[85vw] md:w-60 md:max-w-none h-full bg-brand-900 text-white flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-800">
        <h1 className="text-lg font-bold text-brand-300">TaskBoard</h1>
        <div className="flex items-center gap-1">
          <NotificationBell onOpenIssue={onOpenNotificationIssue} />
          <button onClick={handleCloseClick} className="text-brand-400 hover:text-white text-sm p-1" title="メニューを閉じる">✕</button>
        </div>
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

      <div className="border-t border-brand-800 px-4 py-3 flex items-center gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="shrink-0" title="アイコンを変更">
          <Avatar name={currentUser.name} avatarFilename={currentUser.avatar_url} size="md" className="cursor-pointer hover:opacity-80 transition-opacity" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={handleAvatarUpload} />
        <div className="min-w-0">
          <p className="text-xs text-brand-300 truncate">{currentUser.name}</p>
          <button
            onClick={onLogout}
            className="text-xs text-brand-500 hover:text-brand-300"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
