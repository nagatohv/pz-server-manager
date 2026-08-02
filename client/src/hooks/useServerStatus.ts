import { useState, useEffect, useRef, useCallback } from 'react';
import { ApiService } from '../services/apiService.js';
import { ENV } from '../config/env.js';
import {
  BranchInfo,
  BranchCatalogSource,
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
  if (ENV.WS_URL) {
    const separator = ENV.WS_URL.includes('?') ? '&' : '?';
    return `${ENV.WS_URL}${separator}token=${token}`;
  }
  const protocol = window.location.protocol === HTTPS_PROTOCOL ? WS_PROTOCOL_SECURE : WS_PROTOCOL_PLAIN;
  return `${protocol}//${window.location.host}${WS_PATH}?token=${token}`;
};

export type BranchLoadState = 'idle' | 'loading' | 'ready' | 'error';

export function useServerStatus(
  token: string | null,
  onSessionExpired: () => void,
  onError?: (msg: string) => void
) {
  const [status, setStatus] = useState<ServerStatusPayload>(DEFAULT_STATUS);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<BranchInfo[]>([]);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [branchesState, setBranchesState] = useState<BranchLoadState>('idle');
  const [branchesSource, setBranchesSource] = useState<BranchCatalogSource>('steam');
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;

  const fetchStatus = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const data = await ApiService.getStatus(t);
      setStatus((prev) => ({ ...prev, ...data }));
    } catch (e: unknown) {
      if (e instanceof Error && isAuthError(e.message)) onSessionExpired();
    }
  }, [onSessionExpired]);

  const fetchBranches = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    setBranchesState('loading');
    try {
      const snapshot = await ApiService.getBranchCatalogSnapshot(t);
      applyBranchSnapshot(snapshot);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : CLIENT_STRINGS.ERRORS.REQUEST_FAILED;
      setAvailableBranches([]);
      setBranchesError(message);
      setBranchesState('error');
    }
  }, []);

  const applyBranchSnapshot = useCallback((snapshot: {
    branches: BranchInfo[];
    isLoading: boolean;
    error: string | null;
    fetchedAt: number | null;
    source?: BranchCatalogSource;
  }) => {
    setAvailableBranches(snapshot.branches);
    setSelectedBranch((current) => {
      if (current && snapshot.branches.some((b) => b.name === current)) return current;
      if (snapshot.branches.length === 0) return '';
      return snapshot.branches.find((b) => b.isDefault)?.name ?? snapshot.branches[0].name;
    });
    setBranchesError(snapshot.error ?? null);
    setBranchesState(snapshot.isLoading ? 'loading' : 'ready');
    setBranchesSource(snapshot.source ?? 'steam');
  }, []);

  const connectWebSocket = useCallback(() => {
    const t = tokenRef.current;
    if (!t) return;
    const ws = new WebSocket(buildWebSocketUrl(t));
    wsRef.current = ws;

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === WsMessageType.Log) {
          setLogs((prev) => [...prev.slice(-(LOG_HISTORY_MAX_LINES - 1)), msg.data as string]);
        } else if (msg.type === WsMessageType.LogsHistory) {
          setLogs(msg.data as string[]);
        } else if (msg.type === WsMessageType.StatusUpdate) {
          setStatus((prev) => ({ ...prev, ...msg.data }));
        } else if (msg.type === WsMessageType.BranchesUpdate) {
          const snapshot = msg.data as {
            branches: BranchInfo[];
            isLoading: boolean;
            error: string | null;
            fetchedAt: number | null;
            source?: BranchCatalogSource;
          };
          if (snapshot && Array.isArray(snapshot.branches)) {
            applyBranchSnapshot(snapshot);
          }
        }
      } catch (_) { }
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (tokenRef.current) connectWebSocket();
      }, WS_RECONNECT_DELAY_MS);
    };
  }, [applyBranchSnapshot]);

  useEffect(() => {
    if (!token) return;
    fetchStatus();
    fetchBranches();
    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, [token, fetchStatus, fetchBranches, connectWebSocket]);

  // Reloj en tiempo real para el apagado automático por inactividad
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (status.idleShutdown?.active && status.idleShutdown.remainingSeconds > 0) {
      timer = setInterval(() => {
        setStatus((prev) => {
          if (!prev.idleShutdown?.active || prev.idleShutdown.remainingSeconds <= 0) {
            if (timer) clearInterval(timer);
            return prev;
          }
          return {
            ...prev,
            idleShutdown: {
              ...prev.idleShutdown,
              remainingSeconds: prev.idleShutdown.remainingSeconds - 1
            }
          };
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status.idleShutdown?.active, status.idleShutdown?.remainingSeconds]);

  const executeAction = useCallback(
    async (action: ServerAction, branch?: string) => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        await ApiService.executeControlAction(t, action, branch);
        await fetchStatus();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : CLIENT_STRINGS.ERRORS.UNKNOWN_ERROR;
        if (onError) {
          onError(msg);
        }
      }
    },
    [fetchStatus, onError]
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
    availableBranches,
    branchesState,
    branchesError,
    branchesSource,
    refreshBranches: fetchBranches,
    executeAction,
    sendCommand
  };
}
