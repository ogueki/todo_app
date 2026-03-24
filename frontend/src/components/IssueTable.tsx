import { useMemo } from "react";
import type { Issue, User } from "../types.ts";
import { STATUSES, PRIORITIES, TYPES } from "../types.ts";
import Avatar from "./Avatar.tsx";

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

  // ツリー構造に並び替え: 親課題の直後に子課題を配置
  const treeIssues = useMemo(() => {
    const parents = issues.filter((i) => !i.parent_issue_id);
    const childMap = new Map<number, Issue[]>();
    for (const i of issues) {
      if (i.parent_issue_id) {
        const children = childMap.get(i.parent_issue_id) || [];
        children.push(i);
        childMap.set(i.parent_issue_id, children);
      }
    }
    const result: { issue: Issue; isChild: boolean }[] = [];
    for (const parent of parents) {
      result.push({ issue: parent, isChild: false });
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b text-gray-600">
          <tr>
            <th className="px-4 py-3 font-medium">キー</th>
            <th className="px-4 py-3 font-medium">種別</th>
            <th className="px-4 py-3 font-medium min-w-[200px]">件名</th>
            <th className="px-4 py-3 font-medium">ステータス</th>
            <th className="px-4 py-3 font-medium">優先度</th>
            <th className="px-4 py-3 font-medium">担当者</th>
            <th className="px-4 py-3 font-medium">期限日</th>
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
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {isChild && <span className="text-gray-300 mr-1">└</span>}
                  {issue.issue_key}
                </td>
                <td className="px-4 py-3 text-gray-600">{type.name}</td>
                <td className={`px-4 py-3 font-medium text-gray-900 ${isChild ? "pl-8" : ""}`}>
                  {issue.subject}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {status.name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium" style={{ color: priority.color }}>
                    ● {priority.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {assignee ? (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={assignee.name} avatarFilename={assignee.avatar_url} size="xs" />
                      {assignee.name}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{issue.due_date ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
