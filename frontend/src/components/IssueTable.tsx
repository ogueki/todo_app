import { useMemo } from "react";
import type { Issue, User } from "../types.ts";
import { STATUSES, PRIORITIES, TYPES } from "../types.ts";
import Avatar from "./Avatar.tsx";
import TypeIcon from "./TypeIcon.tsx";

interface Props {
  issues: Issue[];
  users: User[];
  onClickIssue: (issue: Issue) => void;
}

export default function IssueTable({ issues, users, onClickIssue }: Props) {
  const getUser = (id: number | null) => users.find((u) => u.id === id);
  const getStatus = (id: number) => STATUSES.find((s) => s.id === id)!;
  const getPriority = (id: number) => PRIORITIES.find((p) => p.id === id)!;
  const getType = (id: number) => TYPES.find((t) => t.id === id)!;

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (issue: Issue) =>
    !!issue.due_date && issue.due_date < today && issue.status_id !== 4;

  // ツリー構造に並び替え: 親課題の直後に子課題を配置
  const treeIssues = useMemo(() => {
    const issueIds = new Set(issues.map((i) => i.id));
    const childMap = new Map<number, Issue[]>();
    const topLevel: Issue[] = [];
    for (const i of issues) {
      if (i.parent_issue_id && issueIds.has(i.parent_issue_id)) {
        const children = childMap.get(i.parent_issue_id) || [];
        children.push(i);
        childMap.set(i.parent_issue_id, children);
      } else {
        topLevel.push(i);
      }
    }
    const result: { issue: Issue; isChild: boolean }[] = [];
    for (const parent of topLevel) {
      const isChild = !!parent.parent_issue_id;
      result.push({ issue: parent, isChild });
      const children = childMap.get(parent.id) || [];
      for (const child of children) {
        result.push({ issue: child, isChild: true });
      }
    }
    return result;
  }, [issues]);

  if (issues.length === 0) {
    return <p className="text-gray-400 text-center py-16">課題がありません</p>;
  }

  return (
    <>
      {/* モバイル: カード型リスト */}
      <ul className="md:hidden space-y-2">
        {treeIssues.map(({ issue, isChild }) => {
          const status = getStatus(issue.status_id);
          const priority = getPriority(issue.priority_id);
          const type = getType(issue.type_id);
          const assignee = getUser(issue.assignee_id);
          const overdue = isOverdue(issue);
          return (
            <li key={issue.id} className={isChild ? "ml-5" : ""}>
              <button
                onClick={() => onClickIssue(issue)}
                className="w-full text-left bg-white border border-gray-200 rounded-md p-3 hover:border-brand-300 active:bg-brand-50/60 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  {isChild && (
                    <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 10 4 15 9 20" />
                      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                    </svg>
                  )}
                  <TypeIcon typeId={issue.type_id} className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="font-mono text-xs text-gray-400 shrink-0">{issue.issue_key}</span>
                  <span className="sr-only">{type.name}</span>
                  <span
                    className="ml-auto inline-block px-2 py-0.5 rounded text-[11px] font-medium shrink-0"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {status.name}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 break-words">
                  {issue.subject}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
                  <span className="flex items-center gap-1 shrink-0" style={{ color: priority.color }}>
                    <span aria-hidden>●</span>
                    <span className="text-gray-500">{priority.name}</span>
                  </span>
                  {assignee ? (
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="text-gray-300">|</span>
                      <Avatar name={assignee.name} avatarFilename={assignee.avatar_url} size="xs" />
                      <span className="truncate">{assignee.name}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400">
                      <span className="text-gray-300">|</span>
                      未割り当て
                    </span>
                  )}
                  {issue.due_date && (
                    <span className={`ml-auto shrink-0 ${overdue ? "text-red-500 font-medium" : "text-gray-500"}`}>
                      {issue.due_date}
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* デスクトップ: テーブル */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-gray-600">
            <tr>
              <th className="px-3 py-2 font-medium whitespace-nowrap">キー</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">種別</th>
              <th className="px-3 py-2 font-medium min-w-[200px]">件名</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">ステータス</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">優先度</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">担当者</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">期限日</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {treeIssues.map(({ issue, isChild }) => {
              const status = getStatus(issue.status_id);
              const priority = getPriority(issue.priority_id);
              const type = getType(issue.type_id);
              const assignee = getUser(issue.assignee_id);
              return (
                <tr
                  key={issue.id}
                  onClick={() => onClickIssue(issue)}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${isChild ? "bg-gray-50/50" : ""}`}
                >
                  <td className="px-3 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {isChild && <span className="text-gray-300 mr-1">└</span>}
                    {issue.issue_key}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <TypeIcon typeId={issue.type_id} className="w-3.5 h-3.5 text-gray-400" />
                      {type.name}
                    </span>
                  </td>
                  <td className={`px-3 py-2 font-medium text-gray-900 ${isChild ? "pl-6" : ""}`}>
                    {issue.subject}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: status.bg, color: status.color }}
                    >
                      {status.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-xs font-medium" style={{ color: priority.color }}>
                      ● {priority.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {assignee ? (
                      <span className="flex items-center gap-1.5">
                        <Avatar name={assignee.name} avatarFilename={assignee.avatar_url} size="xs" />
                        {assignee.name}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{issue.due_date ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
