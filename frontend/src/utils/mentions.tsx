import type { ReactNode } from "react";
import type { UserSummary } from "../types.ts";

// テキスト中の @ユーザー名 を <span> でハイライトしたReactNode配列を返す
// サーバー側 extractMentionedUserIds と同じ走査ロジック（名前長い順優先・@直後一致）
export function renderWithMentions(text: string, users: UserSummary[]): ReactNode[] {
  const sorted = [...users].sort((a, b) => b.name.length - a.name.length);
  const nodes: ReactNode[] = [];
  let buffer = "";
  let key = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "@") {
      let matched: UserSummary | null = null;
      for (const u of sorted) {
        if (text.startsWith(u.name, i + 1)) {
          matched = u;
          break;
        }
      }
      if (matched) {
        if (buffer) {
          nodes.push(buffer);
          buffer = "";
        }
        nodes.push(
          <span
            key={`m-${key++}`}
            className="bg-brand-100 text-brand-700 rounded px-1 font-medium"
          >
            @{matched.name}
          </span>
        );
        i += matched.name.length;
        continue;
      }
    }
    buffer += text[i];
  }
  if (buffer) nodes.push(buffer);
  return nodes;
}
