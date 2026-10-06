"use client";

import PusherClient from "pusher-js";

let _pusherClient: PusherClient | null = null;

/** The shared realtime client, or null when Pusher isn't configured (polling still works). */
export function getPusherClient(): PusherClient | null {
  if (!_pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return null;
    _pusherClient = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return _pusherClient;
}