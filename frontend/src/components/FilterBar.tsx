import type { User } from "../types.ts";
import { STATUSES, PRIORITIES, TYPES } from "../types.ts";

export interface Filters {
  status: number[];
  priority: number[];
  type: number[];
  assignee: number[];
  keyword: string;
  sort: string;
}

export const defaultFilters: Filters = {
  status: [],
  priority: [],
  type: [],
  assignee: [],
  keyword: "",
  sort: "",
};

interface Props {
  filters: Filters;
  users: User[];
  onChange: (filters: Filters) => void;
}

export default function FilterBar({ filters, users, onChange }: Props) {
  const toggleArray = (arr: number[], val: number) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-brand-50/50 border-b border-gray-200 text-sm">
      {/* キーワード */}
      <input
        type="text"
        value={filters.keyword}
        onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
        placeholder="キーワード検索..."
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
      />

      {/* ステータス */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500 text-xs mr-1">ステータス:</span>
        {STATUSES.map((s) => (
          <button
            key={s.id}
            onClick={() => onChange({ ...filters, status: toggleArray(filters.status, s.id) })}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              filters.status.includes(s.id)
                ? "text-white"
                : "text-gray-500 bg-gray-200 hover:bg-gray-300"
            }`}
            style={filters.status.includes(s.id) ? { backgroundColor: s.color } : undefined}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* 優先度 */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500 text-xs mr-1">優先度:</span>
        {PRIORITIES.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange({ ...filters, priority: toggleArray(filters.priority, p.id) })}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              filters.priority.includes(p.id)
                ? "text-white"
                : "text-gray-500 bg-gray-200 hover:bg-gray-300"
            }`}
            style={filters.priority.includes(p.id) ? { backgroundColor: p.color } : undefined}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* 種別 */}
      <select
        value={filters.type.length === 1 ? filters.type[0] : ""}
        onChange={(e) => onChange({ ...filters, type: e.target.value ? [Number(e.target.value)] : [] })}
        className="border rounded-md px-2 py-1.5 text-xs bg-white"
      >
        <option value="">全種別</option>
        {TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      {/* 担当者 */}
      <select
        value={filters.assignee.length === 1 ? filters.assignee[0] : ""}
        onChange={(e) => onChange({ ...filters, assignee: e.target.value ? [Number(e.target.value)] : [] })}
        className="border rounded-md px-2 py-1.5 text-xs bg-white"
      >
        <option value="">全担当者</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>

      {/* ソート */}
      <select
        value={filters.sort}
        onChange={(e) => onChange({ ...filters, sort: e.target.value })}
        className="border rounded-md px-2 py-1.5 text-xs bg-white"
      >
        <option value="">新しい順</option>
        <option value="updated">更新日順</option>
        <option value="priority">優先度順</option>
        <option value="due">期限日順</option>
      </select>

      {/* リセット */}
      {JSON.stringify(filters) !== JSON.stringify(defaultFilters) && (
        <button
          onClick={() => onChange(defaultFilters)}
          className="text-xs text-brand-500 hover:text-brand-700"
        >
          リセット
        </button>
      )}
    </div>
  );
}
