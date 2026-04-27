import { useState, useEffect, useRef } from "react";
import type { Notification } from "../types.ts";
import { useNotifications } from "../NotificationContext.tsx";

interface Props {
  onOpenIssue: (projectKey: string, issueKey: string) => void;
}

export default function NotificationBell({ onOpenIssue }: Props) {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClickItem = async (n: Notification) => {
    if (!n.is_read) {
      await markRead(n.id);
    }
    if (n.project_key && n.issue_key) {
      onOpenIssue(n.project_key, n.issue_key);
      setOpen(false);
    }
  };

  const handleReadAll = async () => {
    if (unreadCount === 0) return;
    await markAllRead();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-brand-300 hover:text-white p-2"
        title="通知"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] leading-none min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed top-14 left-4 right-4 md:absolute md:top-full md:left-0 md:right-auto md:mt-2 md:w-80 max-h-[70vh] md:max-h-[480px] bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
            <span className="text-sm font-semibold">通知</span>
            <button
              onClick={handleReadAll}
              disabled={unreadCount === 0}
              className="text-xs text-brand-500 hover:text-brand-600 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              すべて既読にする
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">通知はありません</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickItem(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-brand-50 transition-colors ${
                    n.is_read ? "" : "bg-brand-50/50"
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    {!n.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" aria-label="未読" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return d.toLocaleDateString("ja-JP");
}
