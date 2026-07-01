// PASTE LOCATION: src/hooks/use-notifications.ts (overwrite entire file)

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  entityId: string | null;
  entityType: string | null;
  createdAt: string;
}

const POLL_INTERVAL_MS = 15000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent fail — next poll retries automatically
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Wrapping in an async IIFE (instead of calling fetchNotifications
    // directly) so the effect body itself never synchronously triggers
    // setState — the linter can verify the setState calls only happen
    // after the awaited fetch resolves, inside a microtask.
    (async () => {
      if (!cancelled) await fetchNotifications();
    })();

    intervalRef.current = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}