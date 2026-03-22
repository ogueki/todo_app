import { useState, useEffect } from "react";
import type { Issue, User, Comment } from "../types.ts";
import { STATUSES, PRIORITIES, TYPES, RESOLUTIONS } from "../types.ts";
import * as api from "../api.ts";

interface Props {
  issue: Issue | null; // null = 新規作成
  users: User[];
  onSave: (data: Partial<Issue>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function IssueModal({ issue, users, onSave, onDelete, onClose }: Props) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState(1);
  const [priorityId, setPriorityId] = useState(2);
  const [typeId, setTypeId] = useState(1);
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [resolutionId, setResolutionId] = useState<number | "">("");
  const [error, setError] = useState("");

  // コメント
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (issue) {
      setSubject(issue.subject);
      setDescription(issue.description || "");
      setStatusId(issue.status_id);
      setPriorityId(issue.priority_id);
      setTypeId(issue.type_id);
      setAssigneeId(issue.assignee_id ?? "");
      setStartDate(issue.start_date || "");
      setDueDate(issue.due_date || "");
      setResolutionId(issue.resolution_id ?? "");
      // コメント読み込み
      api.fetchComments(issue.id).then(setComments);
    }
  }, [issue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError("件名は必須です");
      return;
    }
    if (startDate && dueDate && startDate > dueDate) {
      setError("開始日は期限日以前にしてください");
      return;
    }
    onSave({
      subject: subject.trim(),
      description,
      status_id: statusId,
      priority_id: priorityId,
      type_id: typeId,
      assignee_id: assigneeId === "" ? null : Number(assigneeId),
      start_date: startDate || null,
      due_date: dueDate || null,
      resolution_id: statusId === 4 && resolutionId !== "" ? Number(resolutionId) : null,
    });
  };

  const handleAddComment = async () => {
    if (!issue || !newComment.trim()) return;
    const comment = await api.createComment(issue.id, { content: newComment.trim(), user_id: 1 });
    setComments((prev) => [comment, ...prev]);
    setNewComment("");
  };

  const handleDeleteComment = async (commentId: number) => {
    await api.deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const selectClass = "w-full border rounded-md px-3 py-2 text-sm bg-white";
  const inputClass = "w-full border rounded-md px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {issue ? `${issue.issue_key} の編集` : "課題の追加"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">件名 *</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className={inputClass} maxLength={200} placeholder="課題の件名を入力" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
              <select value={typeId} onChange={(e) => setTypeId(Number(e.target.value))} className={selectClass}>
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select value={statusId} onChange={(e) => setStatusId(Number(e.target.value))} className={selectClass}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
              <select value={priorityId} onChange={(e) => setPriorityId(Number(e.target.value))} className={selectClass}>
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value === "" ? "" : Number(e.target.value))} className={selectClass}>
                <option value="">未割り当て</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期限日</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* 完了理由（ステータスが「完了」の場合のみ表示） */}
          {statusId === 4 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">完了理由</label>
              <select value={resolutionId} onChange={(e) => setResolutionId(e.target.value === "" ? "" : Number(e.target.value))} className={selectClass}>
                <option value="">未選択</option>
                {RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">詳細</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} h-32 resize-none`} maxLength={10000} placeholder="課題の詳細を入力" />
          </div>

          <div className="flex justify-between pt-2">
            <div>
              {issue && onDelete && (
                <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700 text-sm">削除</button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">キャンセル</button>
              <button type="submit" className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                {issue ? "更新" : "追加"}
              </button>
            </div>
          </div>
        </form>

        {/* コメントセクション（編集時のみ表示） */}
        {issue && (
          <div className="border-t px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">コメント</h3>

            {/* コメント入力 */}
            <div className="flex gap-2 mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを入力..."
                className="flex-1 border rounded-md px-3 py-2 text-sm resize-none h-16"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="self-end px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                投稿
              </button>
            </div>

            {/* コメント一覧 */}
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400">コメントはありません</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-md px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{c.user_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{c.created_at}</span>
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
