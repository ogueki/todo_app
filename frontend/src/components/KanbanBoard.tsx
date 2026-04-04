import { useState, useRef } from "react";
import type { Issue, User } from "../types.ts";
import { STATUSES, PRIORITIES, RESOLUTIONS } from "../types.ts";
import Avatar from "./Avatar.tsx";

interface Props {
  issues: Issue[];
  users: User[];
  onStatusChange: (issueId: number, statusId: number, resolutionId?: number | null) => void;
  onClickIssue: (issue: Issue) => void;
}

export default function KanbanBoard({ issues, users, onStatusChange, onClickIssue }: Props) {
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null);
  const dragCounter = useRef<Record<number, number>>({});

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
      if (statusId === 4) {
        setResolutionDialog({ issueId: draggedIssue.id });
        setSelectedResolution("");
      } else {
        onStatusChange(draggedIssue.id, statusId);
      }
    }
    setDraggedIssue(null);
    setDragOverColumn(null);
    dragCounter.current = {};
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
            className={`flex-1 min-w-[260px] rounded-lg flex flex-col transition-colors ${
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
