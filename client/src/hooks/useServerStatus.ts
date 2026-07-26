import { useState, useEffect, useRef, useCallback } from 'react';
import { ApiService } from '../services/apiService.js';
import {
  ServerStatus,
  ServerStatusPayload,
  WsMessageType,
  ServerAction
} from '../types.js';
import {
  LOG_HISTORY_MAX_LINES,
  WS_PROTOCOL_SECURE,
  WS_PROTOCOL_PLAIN,
  HTTPS_PROTOCOL,
  WS_PATH,
  WS_RECONNECT_DELAY_MS
} from '../config/constants.js';
import { CLIENT_STRINGS } from '../config/strings.js';

const DEFAULT_STATUS: ServerStatusPayload = {
  status: ServerStatus.Stopped,
  onlinePlayers: 0,
  stats: { cpu: 0, memory: 0, memoryTotal: 0 },
  idleShutdown: { minutes: 0, active: false, remainingSeconds: 0 }
};

const isAuthError = (message: string): boolean =>
  message.includes('expirada') || message.includes('autorizada');

const buildWebSocketUrl = (token: string): string => {
  const protocol = window.location.protocol === HTTPS_PROTOCOL ? WS_PROTOCOL_SECURE : WS_PROTOCOL_PLAIN;
  return `${protocol}//${window.location.host}${WS_PATH}?token=${token}`;
};

export function useServerStatus(token: string | null, onSessionExpired: () => void) {
  const [status, setStatus] = useState<ServerStatusPayload>(DEFAULT_STATUS);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const data = await ApiService.getStatus(token);
      setStatus(data);
    } catch (e: unknown) {
      if (e instanceof Error && isAuthError(e.message)) onSessionExpired();
    }
  }, [token, onSessionExpired]);

  const connectWebSocket = useCallback(() => {
    if (!token) return;
    const ws = new WebSocket(buildWebSocketUrl(token));
    wsRef.current = ws;

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === WsMessageType.Log) {
          setLogs((prev) => [...prev.slice(-(LOG_HISTORY_MAX_LINES - 1)), msg.data as string]);
        } else if (msg.type === WsMessageType.LogsHistory) {
          setLogs(msg.data as string[]);
        } else if (msg.type === WsMessageType.StatusUpdate) {
          setStatus(msg.data as ServerStatusPayload);
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (token) connectWebSocket();
      }, WS_RECONNECT_DELAY_MS);
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchStatus();
    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, [token, fetchStatus, connectWebSocket]);

  const executeAction = useCallback(
    async (action: ServerAction, branch?: string) => {
      if (!token) return;
      try {
        await ApiService.executeControlAction(token, action, branch);
        await fetchStatus();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : CLIENT_STRINGS.ERRORS.UNKNOWN_ERROR;
        alert(msg);
      }
    },
    [token, fetchStatus]
  );

  const sendCommand = useCallback((command: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: WsMessageType.Command, data: command }));
    }
  }, []);

  return {
    status,
    logs,
    selectedBranch,
    setSelectedBranch,
    executeAction,
    sendCommand
  };
}
