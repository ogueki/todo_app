import { useState, useEffect } from "react";
import type { Project } from "../types.ts";

interface Props {
  project: Project | null; // null = 新規作成
  onSave: (data: { project_key: string; name: string; description: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function ProjectModal({ project, onSave, onDelete, onClose }: Props) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (project) {
      setKey(project.project_key);
      setName(project.name);
      setDescription(project.description);
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !name) {
      setError("プロジェクトキーと名前は必須です");
      return;
    }
    if (!/^[A-Z]{2,10}$/.test(key)) {
      setError("プロジェクトキーは英大文字2〜10文字で入力してください");
      return;
    }
    onSave({ project_key: key, name, description });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{project ? "プロジェクト編集" : "プロジェクト作成"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">プロジェクトキー</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              disabled={!!project}
              placeholder="例: PROJ"
              className="w-full border rounded-md px-3 py-2 text-sm disabled:bg-gray-100"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">プロジェクト名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: サンプルプロジェクト"
              className="w-full border rounded-md px-3 py-2 text-sm"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm h-24 resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex justify-between pt-2">
            <div>
              {project && onDelete && (
                <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700 text-sm">
                  削除
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                キャンセル
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-brand-400 text-white rounded-md hover:bg-brand-500 transition-colors">
                {project ? "更新" : "作成"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
