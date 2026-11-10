import { useEffect, useRef, useCallback } from 'react';
import { getToken } from '../api/client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

type WsHandler = (event: unknown) => void;

/**
 * Connects to the ConnectSphere WebSocket, authenticates, and calls
 * `onMessage` for every incoming server event.
 *
 * Automatically reconnects on disconnect (exponential backoff, max 30s).
 */
export function useWebSocket(onMessage: WsHandler, enabled = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      retryCount.current = 0;
      ws.send(JSON.stringify({ type: 'authenticate', token }));
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessageRef.current(data);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!enabled) return;
      const delay = Math.min(1000 * 2 ** retryCount.current, 30_000);
      retryCount.current++;
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
