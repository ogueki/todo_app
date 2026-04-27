import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { Notification } from "./types.ts";
import * as api from "./api.ts";

interface NotificationContextValue {
  items: Notification[];
  unreadCount: number;
  reload: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const Ctx = createContext<NotificationContextValue | null>(null);

const POLL_INTERVAL_MS = 60_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const reload = useCallback(async () => {
    try {
      const res = await api.fetchNotifications();
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // 認証エラー等はapi側で処理
    }
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reload]);

  const markRead = useCallback(async (id: number) => {
    await api.markNotificationRead(id);
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.markAllNotificationsRead();
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnreadCount(0);
  }, []);

  return (
    <Ctx.Provider value={{ items, unreadCount, reload, markRead, markAllRead }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
