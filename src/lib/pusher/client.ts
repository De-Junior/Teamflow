// PASTE LOCATION: src/lib/pusher/client.ts (new file)
"use client";

import PusherClient from "pusher-js";

let _pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!_pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) {
      throw new Error("NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER are not set");
    }
    _pusherClient = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return _pusherClient;
}