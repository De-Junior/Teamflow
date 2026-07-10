// PASTE LOCATION: src/lib/pusher/server.ts (replace entire file)
import PusherServer from "pusher";

let _pusher: PusherServer | null = null;

export function getPusher(): PusherServer {
  if (!_pusher) {
    const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
    if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
      throw new Error("Pusher server env vars are not set");
    }
    _pusher = new PusherServer({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return _pusher;
}

export { userChannel, orgChannel, taskChannel } from "./channels";