import { useState, useEffect } from "react";
import type { Issue, User, Comment } from "../types.ts";
import { STATUSES, PRIORITIES, TYPES, RESOLUTIONS } from "../types.ts";
import * as api from "../api.ts";
import Avatar from "./Avatar.tsx";

interface Props {
  issue: Issue;
  issues: Issue[];
  users: User[];
  currentUserId: number;
  projectId: number;
  onBack: () => void;
  onIssueUpdated: () => void;
  onOpenIssue: (issue: Issue) => void;
  onAddChildIssue: (parentIssueId: number) => void;
}

export default function IssueDetailPage({
  issue, issues, users, currentUserId, projectId,
  onBack, onIssueUpdated, onOpenIssue, onAddChildIssue,
}: Props) {
  // 編集状態
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(issue.subject);
  const [description, setDescription] = useState(issue.description || "");
  const [statusId, setStatusId] = useState(issue.status_id);
  const [priorityId, setPriorityId] = useState(issue.priority_id);
  const [typeId, setTypeId] = useState(issue.type_id);
  const [assigneeId, setAssigneeId] = useState<number | "">(issue.assignee_id ?? "");
  const [startDate, setStartDate] = useState(issue.start_date || "");
  const [dueDate, setDueDate] = useState(issue.due_date || "");
  const [resolutionId, setResolutionId] = useState<number | "">(issue.resolution_id ?? "");
  const [parentIssueId, setParentIssueId] = useState<number | "">(issue.parent_issue_id ?? "");
  const [error, setError] = useState("");

  // コメント
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  // 子課題
  const childIssues = issues.filter((i) => i.parent_issue_id === issue.id);

  const getUser = (id: number | null) => users.find((u) => u.id === id);
  const getStatus = (id: number) => STATUSES.find((s) => s.id === id)!;
  const getPriority = (id: number) => PRIORITIES.find((p) => p.id === id)!;
  const getType = (id: number) => TYPES.find((t) => t.id === id)!;
  const getResolution = (id: number | null) => RESOLUTIONS.find((r) => r.id === id);

  useEffect(() => {
    api.fetchComments(issue.id).then(setComments);
  }, [issue.id]);

  // issue が外部で更新された場合にstateを同期
  useEffect(() => {
    setSubject(issue.subject);
    setDescription(issue.description || "");
    setStatusId(issue.status_id);
    setPriorityId(issue.priority_id);
    setTypeId(issue.type_id);
    setAssigneeId(issue.assignee_id ?? "");
    setStartDate(issue.start_date || "");
    setDueDate(issue.due_date || "");
    setResolutionId(issue.resolution_id ?? "");
    setParentIssueId(issue.parent_issue_id ?? "");
  }, [issue]);

  const handleSave = async () => {
    if (!subject.trim()) { setError("件名は必須です"); return; }
    if (startDate && dueDate && startDate > dueDate) { setError("開始日は期限日以前にしてください"); return; }
    setError("");
    try {
      await api.updateIssue(projectId, issue.id, {
        subject: subject.trim(),
        description,
        status_id: statusId,
        priority_id: priorityId,
        type_id: typeId,
        assignee_id: assigneeId === "" ? null : Number(assigneeId),
        start_date: startDate || null,
        due_date: dueDate || null,
        resolution_id: statusId === 4 && resolutionId !== "" ? Number(resolutionId) : null,
        parent_issue_id: parentIssueId === "" ? null : Number(parentIssueId),
      });
      setEditing(false);
      onIssueUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const comment = await api.createComment(issue.id, { content: newComment.trim(), user_id: currentUserId });
    setComments((prev) => [comment, ...prev]);
    setNewComment("");
  };

  const handleDeleteComment = async (commentId: number) => {
    await api.deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const selectClass = "border rounded-md px-2 py-1.5 text-sm bg-white w-full";
  const inputClass = "border rounded-md px-2 py-1.5 text-sm w-full";

  const status = getStatus(issue.status_id);
  const priority = getPriority(issue.priority_id);
  const createdByUser = getUser(issue.created_by);
  const parentIssue = issues.find((i) => i.id === issue.parent_issue_id);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* 親課題バナー */}
      {parentIssue && (
        <div className="flex items-center gap-2 px-6 py-2 bg-brand-50 border-b border-brand-200 text-sm">
          <span className="text-brand-600 font-medium">親課題</span>
          <span className="text-brand-300">▶</span>
          <button
            onClick={() => onOpenIssue(parentIssue)}
            className="text-brand-600 hover:text-brand-800 hover:underline font-medium"
          >
            {parentIssue.issue_key}
          </button>
          <span className="text-gray-600 truncate">{parentIssue.subject}</span>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">
          ← 戻る
        </button>
        <span className="font-mono text-sm text-gray-500">{issue.issue_key}</span>
        <div className="ml-auto flex gap-2">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
              編集
            </button>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                キャンセル
              </button>
              <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-brand-400 text-white rounded-md hover:bg-brand-500 transition-colors">
                保存
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm px-6 py-2 bg-red-50">{error}</p>}

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto flex">
        {/* 左: 本文エリア */}
        <div className="flex-1 p-6 overflow-auto min-w-0">
          {/* 件名 */}
          {editing ? (
            <input
              type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="text-xl font-bold w-full border-b border-gray-300 pb-2 mb-4 outline-none focus:border-brand-400"
              maxLength={200}
            />
          ) : (
            <h1 className="text-xl font-bold pb-2 mb-4 border-b">{issue.subject}</h1>
          )}

          {/* 説明 */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">説明</h3>
            {editing ? (
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm h-40 resize-none"
                maxLength={10000} placeholder="課題の詳細を入力"
              />
            ) : (
              <div className="text-sm text-gray-700 whitespace-pre-wrap min-h-[40px]">
                {issue.description || <span className="text-gray-400">説明なし</span>}
              </div>
            )}
          </div>

          {/* 子課題一覧 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                子課題 ({childIssues.length})
              </h3>
              {!issue.parent_issue_id && (
                <button
                  onClick={() => onAddChildIssue(issue.id)}
                  className="px-3 py-1 text-xs bg-brand-400 text-white rounded-md hover:bg-brand-500 transition-colors"
                >
                  + 子課題を追加
                </button>
              )}
            </div>
            {childIssues.length === 0 ? (
              <p className="text-sm text-gray-400">子課題はありません</p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                      <th className="text-left px-3 py-2 font-medium">キー</th>
                      <th className="text-left px-3 py-2 font-medium">種別</th>
                      <th className="text-left px-3 py-2 font-medium">件名</th>
                      <th className="text-left px-3 py-2 font-medium">ステータス</th>
                      <th className="text-left px-3 py-2 font-medium">優先度</th>
                      <th className="text-left px-3 py-2 font-medium">担当者</th>
                      <th className="text-left px-3 py-2 font-medium">期限日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {childIssues.map((child) => {
                      const cs = getStatus(child.status_id);
                      const cp = getPriority(child.priority_id);
                      const ct = getType(child.type_id);
                      const ca = getUser(child.assignee_id);
                      return (
                        <tr
                          key={child.id}
                          onClick={() => onOpenIssue(child)}
                          className="hover:bg-brand-50/50 cursor-pointer"
                        >
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-400 whitespace-nowrap">{child.issue_key}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{ct.name}</td>
                          <td className="px-3 py-2.5 text-gray-800 truncate max-w-[300px]">{child.subject}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: cs.bg, color: cs.color }}
                            >
                              {cs.name}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="text-xs font-medium" style={{ color: cp.color }}>● {cp.name}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                            {ca ? (
                              <span className="flex items-center gap-1">
                                <Avatar name={ca.name} avatarFilename={ca.avatar_url} size="xs" />
                                {ca.name}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{child.due_date ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* コメントセクション */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              コメント ({comments.length})
            </h3>

            {/* コメント入力 */}
            <div className="flex gap-2 mb-4">
              <textarea
                value={newComment} onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを入力..."
                className="flex-1 border rounded-md px-3 py-2 text-sm resize-none h-20"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="self-end px-3 py-2 text-sm bg-brand-400 text-white rounded-md hover:bg-brand-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                投稿
              </button>
            </div>

            {/* コメント一覧 */}
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-md px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <Avatar name={c.user_name} avatarFilename={c.user_avatar_url} size="sm" />
                      {c.user_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{c.created_at}</span>
                      <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-gray-400 hover:text-red-500">
                        削除
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-gray-400">コメントはありません</p>
              )}
            </div>
          </div>
        </div>

        {/* 右: 属性パネル */}
        <div className="w-64 border-l border-gray-200 bg-brand-50/30 p-4 space-y-4 overflow-auto shrink-0">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">属性</h3>

          {/* ステータス */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">ステータス</label>
            {editing ? (
              <select value={statusId} onChange={(e) => setStatusId(Number(e.target.value))} className={selectClass}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: status.bg, color: status.color }}>
                {status.name}
              </span>
            )}
          </div>

          {/* 完了理由 */}
          {(editing ? statusId === 4 : issue.status_id === 4) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">完了理由</label>
              {editing ? (
                <select value={resolutionId} onChange={(e) => setResolutionId(e.target.value === "" ? "" : Number(e.target.value))} className={selectClass}>
                  <option value="">未選択</option>
                  {RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              ) : (
                <span className="text-sm text-gray-700">{getResolution(issue.resolution_id)?.name ?? "—"}</span>
              )}
            </div>
          )}

          {/* 優先度 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">優先度</label>
            {editing ? (
              <select value={priorityId} onChange={(e) => setPriorityId(Number(e.target.value))} className={selectClass}>
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <span className="text-sm font-medium" style={{ color: priority.color }}>● {priority.name}</span>
            )}
          </div>

          {/* 種別 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">種別</label>
            {editing ? (
              <select value={typeId} onChange={(e) => setTypeId(Number(e.target.value))} className={selectClass}>
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            ) : (
              <span className="text-sm text-gray-700">{getType(issue.type_id).name}</span>
            )}
          </div>

          {/* 担当者 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">担当者</label>
            {editing ? (
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value === "" ? "" : Number(e.target.value))} className={selectClass}>
                <option value="">未割り当て</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            ) : (
              <span className="text-sm text-gray-700 flex items-center gap-1.5">
                {getUser(issue.assignee_id) ? (
                  <>
                    <Avatar name={getUser(issue.assignee_id)!.name} avatarFilename={getUser(issue.assignee_id)!.avatar_url} size="sm" />
                    {getUser(issue.assignee_id)!.name}
                  </>
                ) : "未割り当て"}
              </span>
            )}
          </div>

          {/* 親課題 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">親課題</label>
            {editing ? (
              <select value={parentIssueId} onChange={(e) => setParentIssueId(e.target.value === "" ? "" : Number(e.target.value))} className={selectClass}>
                <option value="">なし</option>
                {issues
                  .filter((i) => i.id !== issue.id && !i.parent_issue_id)
                  .map((i) => <option key={i.id} value={i.id}>{i.issue_key} {i.subject}</option>)}
              </select>
            ) : (
              parentIssue ? (
                <button onClick={() => onOpenIssue(parentIssue)} className="text-sm text-brand-500 hover:underline">
                  {parentIssue.issue_key} {parentIssue.subject}
                </button>
              ) : (
                <span className="text-sm text-gray-400">なし</span>
              )
            )}
          </div>

          {/* 開始日 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            {editing ? (
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            ) : (
              <span className="text-sm text-gray-700">{issue.start_date ?? "—"}</span>
            )}
          </div>

          {/* 期限日 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">期限日</label>
            {editing ? (
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            ) : (
              <span className="text-sm text-gray-700">{issue.due_date ?? "—"}</span>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* メタ情報 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">登録者</label>
            <span className="text-sm text-gray-700 flex items-center gap-1.5">
              {createdByUser ? (
                <>
                  <Avatar name={createdByUser.name} avatarFilename={createdByUser.avatar_url} size="sm" />
                  {createdByUser.name}
                </>
              ) : "—"}
            </span>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">登録日</label>
            <span className="text-xs text-gray-500">{issue.created_at}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">更新日</label>
            <span className="text-xs text-gray-500">{issue.updated_at}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
