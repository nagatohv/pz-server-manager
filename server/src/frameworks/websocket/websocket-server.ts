import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import AuthenticateUseCase from '../../usecases/AuthenticateUseCase.js';
import ControlServerUseCase from '../../usecases/ControlServerUseCase.js';
import { WsMessageType } from '../../types.js';
import type { ProcessObserver, ServerStatusPayload } from '../../types.js';

const WS_PATH = '/ws';
const HTTP_401 = 'HTTP/1.1 401 Unauthorized\r\n\r\n';
const HTTP_403 = 'HTTP/1.1 403 Forbidden\r\n\r\n';

/**
 * Initializes and binds the WebSocket Server to the HTTP Server.
 * Implements the Observer pattern to receive real-time server process updates.
 */
export default function initWebSocketServer(
  httpServer: HttpServer,
  authenticateUseCase: AuthenticateUseCase,
  controlServerUseCase: ControlServerUseCase
) {
  const wss = new WebSocketServer({ 
    noServer: true,
    path: WS_PATH
  });

  // Intercept HTTP upgrade request for authentication and upgrading connection
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.write(HTTP_401);
      socket.destroy();
      return;
    }

    try {
      authenticateUseCase.verify(token);
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (err) {
      socket.write(HTTP_403);
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    // Observer instance for this client connection
    const clientObserver: ProcessObserver = {
      onLog: (logLine: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: WsMessageType.Log, data: logLine }));
        }
      },
      onLogHistory: (history: string[]) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: WsMessageType.LogsHistory, data: history }));
        }
      },
      onStatusUpdate: (status: ServerStatusPayload) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: WsMessageType.StatusUpdate, data: status }));
        }
      }
    };

    // Register as observer
    controlServerUseCase.serverControlService.subscribe(clientObserver);

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString()) as { type: string; data?: string };
        if (parsed.type === WsMessageType.Command && parsed.data) {
          controlServerUseCase.sendCommand(parsed.data);
        }
      } catch (e) {
        // Silently ignore malformed messages
      }
    });

    ws.on('close', () => {
      // Clean up observer subscription
      controlServerUseCase.serverControlService.unsubscribe(clientObserver);
    });
  });

  return wss;
}
export { WebSocket };
