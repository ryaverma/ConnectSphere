import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { redisClient, subscriber, keys } from '../services/redis.js';

// Map userId → Set of WebSocket clients
const userSockets = new Map();

export function initWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    let userId = null;

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'authenticate') {
        try {
          const payload = jwt.verify(msg.token, config.jwt.secret);
          const blacklisted = await redisClient.exists(keys.session(payload.jti));
          if (blacklisted) { ws.close(4001, 'Token revoked'); return; }
          userId = payload.sub;

          if (!userSockets.has(userId)) userSockets.set(userId, new Set());
          userSockets.get(userId).add(ws);

          // Register in Redis for cross-instance routing
          await redisClient.sadd(keys.wsUser(userId), process.env.INSTANCE_ID || 'local');
          ws.send(JSON.stringify({ type: 'authenticated', userId }));
        } catch {
          ws.close(4001, 'Invalid token');
        }
      }
    });

    ws.on('close', async () => {
      if (userId) {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            userSockets.delete(userId);
            await redisClient.del(keys.wsUser(userId));
          }
        }
      }
    });

    ws.on('error', (err) => console.error('[WS] Socket error:', err.message));
  });

  // Subscribe to agent completion events from Python workers
  subscriber.psubscribe('ws:push:*', (err) => {
    if (err) console.error('[WS] Pattern subscribe error:', err);
    else console.log('[WS] Subscribed to ws:push:* channels');
  });

  subscriber.on('pmessage', (_pattern, channel, message) => {
    // channel format: ws:push:{userId}
    const uid = channel.replace('ws:push:', '');
    pushToUser(uid, message);
  });

  console.log('[WS] WebSocket server initialised');
}

/**
 * Push a JSON message to all sockets of a user (local instance).
 * For cross-instance delivery, use Redis pub via ws:push:{userId}.
 */
export function pushToUser(userId, payload) {
  const sockets = userSockets.get(String(userId));
  if (!sockets) return;
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(text);
    }
  }
}

/**
 * Broadcast a structured event to a user from Node.js routes/services.
 * Publishes to Redis so all instances deliver it.
 */
export async function emitToUser(userId, event) {
  await redisClient.publish(`ws:push:${userId}`, JSON.stringify(event));
}
