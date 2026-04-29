import { useState, useRef } from "react";
import type { Issue, UserSummary } from "../types.ts";
import { STATUSES, PRIORITIES, RESOLUTIONS } from "../types.ts";
import Avatar from "./Avatar.tsx";

interface Props {
  issues: Issue[];
  users: UserSummary[];
  onStatusChange: (issueId: number, statusId: number, resolutionId?: number | null) => void;
  onClickIssue: (issue: Issue) => void;
}

export default function KanbanBoard({ issues, users, onStatusChange, onClickIssue }: Props) {
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null);
  const dragCounter = useRef<Record<number, number>>({});

  // モバイル用 ステータス変更シート
  const [moveSheetIssue, setMoveSheetIssue] = useState<Issue | null>(null);

  // 完了理由ダイアログ
  const [resolutionDialog, setResolutionDialog] = useState<{ issueId: number } | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<number | "">("");

  const getUser = (id: number | null) => users.find((u) => u.id === id);
  const getPriority = (id: number) => PRIORITIES.find((p) => p.id === id)!;

  const handleDragStart = (issue: Issue) => {
    setDraggedIssue(issue);
  };

  const handleDragEnter = (statusId: number) => {
    dragCounter.current[statusId] = (dragCounter.current[statusId] || 0) + 1;
    setDragOverColumn(statusId);
  };

  const handleDragLeave = (statusId: number) => {
    dragCounter.current[statusId] = (dragCounter.current[statusId] || 0) - 1;
    if (dragCounter.current[statusId] <= 0) {
      dragCounter.current[statusId] = 0;
      if (dragOverColumn === statusId) setDragOverColumn(null);
    }
  };

  const handleDrop = (statusId: number) => {
    if (draggedIssue && draggedIssue.status_id !== statusId) {
      changeStatus(draggedIssue.id, statusId);
    }
    setDraggedIssue(null);
    setDragOverColumn(null);
    dragCounter.current = {};
  };

  const changeStatus = (issueId: number, statusId: number) => {
    if (statusId === 4) {
      setResolutionDialog({ issueId });
      setSelectedResolution("");
    } else {
      onStatusChange(issueId, statusId);
    }
  };

  const handleResolutionConfirm = () => {
    if (!resolutionDialog) return;
    onStatusChange(resolutionDialog.issueId, 4, selectedResolution === "" ? null : Number(selectedResolution));
    setResolutionDialog(null);
    setSelectedResolution("");
  };

  const handleResolutionCancel = () => {
    setResolutionDialog(null);
    setSelectedResolution("");
  };

  const handleDragEnd = () => {
    setDraggedIssue(null);
    setDragOverColumn(null);
    dragCounter.current = {};
  };

  return (
    <>
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {STATUSES.map((status) => {
        const columnIssues = issues.filter((i) => i.status_id === status.id);
        const isOver = dragOverColumn === status.id;
        return (
          <div
            key={status.id}
            className={`flex-1 min-w-[220px] md:min-w-[260px] rounded-lg flex flex-col transition-colors ${
              isOver ? "bg-brand-100 ring-2 ring-brand-300" : "bg-gray-100"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => handleDragEnter(status.id)}
            onDragLeave={() => handleDragLeave(status.id)}
            onDrop={() => handleDrop(status.id)}
          >
            <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-200">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-sm font-semibold text-gray-700">{status.name}</span>
              <span className="text-xs text-gray-400 ml-auto">{columnIssues.length}</span>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {columnIssues.map((issue) => {
                const priority = getPriority(issue.priority_id);
                const assignee = getUser(issue.assignee_id);
                return (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={() => handleDragStart(issue)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onClickIssue(issue)}
                    className={`bg-white rounded-md shadow-sm border p-3 cursor-pointer hover:shadow-md transition-shadow ${
                      draggedIssue?.id === issue.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-400">{issue.issue_key}</span>
                      <span className="text-xs font-medium" style={{ color: priority.color }}>●</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMoveSheetIssue(issue); }}
                        className="md:hidden ml-auto text-xs text-brand-500 hover:text-brand-700 px-1.5 py-0.5 border border-brand-200 rounded"
                        title="ステータスを変更"
                        aria-label="ステータスを変更"
                      >
                        移動
                      </button>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">{issue.subject}</p>
                    <div className="flex items-center justify-between">
                      {assignee ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                          <Avatar name={assignee.name} avatarFilename={assignee.avatar_url} size="xs" />
                          {assignee.name}
                        </span>
                      ) : (
                        <span />
                      )}
                      {issue.due_date && (
                        <span className="text-xs text-gray-400">{issue.due_date}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>

    {/* モバイル用 ステータス変更シート */}
    {moveSheetIssue && (
      <div
        className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
        onClick={() => setMoveSheetIssue(null)}
      >
        <div
          className="bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-sm sm:mx-4 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            ステータスを変更
            <span className="ml-2 font-mono text-xs text-gray-400">{moveSheetIssue.issue_key}</span>
          </h3>
          <div className="space-y-1">
            {STATUSES.map((s) => {
              const current = s.id === moveSheetIssue.status_id;
              return (
                <button
                  key={s.id}
                  disabled={current}
                  onClick={() => {
                    const id = moveSheetIssue.id;
                    setMoveSheetIssue(null);
                    changeStatus(id, s.id);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    current ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "hover:bg-brand-50"
                  }`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="flex-1">{s.name}</span>
                  {current && <span className="text-xs text-gray-400">現在</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setMoveSheetIssue(null)}
            className="w-full mt-3 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            キャンセル
          </button>
        </div>
      </div>
    )}

    {/* 完了理由ダイアログ */}
    {resolutionDialog && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
          <h3 className="text-lg font-semibold mb-4">完了理由を選択</h3>
          <select
            value={selectedResolution}
            onChange={(e) => setSelectedResolution(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full border rounded-md px-3 py-2 text-sm bg-white mb-4"
          >
            <option value="">未選択</option>
            {RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleResolutionCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
            <button
              onClick={handleResolutionConfirm}
              className="px-4 py-2 text-sm bg-brand-400 text-white rounded-md hover:bg-brand-500 transition-colors"
            >
              完了にする
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
