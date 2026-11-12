import { io, Socket } from 'socket.io-client';
import { executeSilentRefresh, getInMemoryAccessToken } from '@/lib/api-client';

let socketInstance: Socket | null = null;
let connectingPromise: Promise<Socket | null> | null = null;
let currentSocketUserId: string | null = null;

function getActiveToken(): string | null {
  return getInMemoryAccessToken();
}

function isTokenExpiringSoon(tok: string | null): boolean {
  if (!tok) return true;
  try {
    const parts = tok.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return true;
    return payload.exp * 1000 - Date.now() < 60_000;
  } catch {
    return true;
  }
}

/**
 * Returns a shared, persistent Socket.IO connection for the authenticated session.
 * Prevents duplicate socket handshakes and avoids unmount-aborted WebSockets in React Strict Mode.
 */
export async function getChatSocket(userId?: string | null): Promise<Socket | null> {
  // If user changed (e.g. switched accounts), disconnect prior socket
  if (userId && currentSocketUserId && currentSocketUserId !== userId) {
    disconnectChatSocket();
  }
  if (userId) {
    currentSocketUserId = userId;
  }

  // If socket instance already exists, reuse it immediately (no redundant connect calls)
  if (socketInstance) {
    if (socketInstance.disconnected) {
      socketInstance.connect();
    }
    return socketInstance;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    let activeToken = getActiveToken();
    if (!activeToken || isTokenExpiringSoon(activeToken)) {
      await executeSilentRefresh();
      activeToken = getActiveToken();
    }

    if (!activeToken) {
      connectingPromise = null;
      return null;
    }

    if (!socketInstance) {
      socketInstance = io('/', {
        path: '/socket.io',
        auth: { token: activeToken, accessToken: activeToken, context: 'client' },
        query: { token: activeToken, context: 'client' },
        transports: ['polling', 'websocket'],
        upgrade: true,
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 10000,
      });

      socketInstance.on('connect_error', async (err) => {
        if (err.message.includes('AUTHENTICATION_REQUIRED')) {
          await executeSilentRefresh();
          const freshToken = getActiveToken();
          if (freshToken && socketInstance) {
            socketInstance.auth = { token: freshToken, accessToken: freshToken };
          }
        }
      });
    }

    connectingPromise = null;
    return socketInstance;
  })();

  return connectingPromise;
}

/**
 * Disconnects and destroys the shared socket connection (e.g. on user logout).
 */
export function disconnectChatSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
  connectingPromise = null;
  currentSocketUserId = null;
}

