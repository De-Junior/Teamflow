// PASTE LOCATION: src/hooks/use-notifications.ts (overwrite entire file)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusher/client";
import { userChannel } from "@/lib/pusher/channels";


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
  const { data: session } = useSession();
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

  // Initial fetch + polling fallback (in case a Pusher event is missed)
  useEffect(() => {
    let cancelled = false;

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

  // Realtime subscription
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const pusherClient = getPusherClient();
    const channel = pusherClient.subscribe(userChannel(userId));

    const handleNew = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    channel.bind("notification:new", handleNew);

    return () => {
      channel.unbind("notification:new", handleNew);
      pusherClient.unsubscribe(userChannel(userId));
    };
  }, [session?.user?.id]);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}