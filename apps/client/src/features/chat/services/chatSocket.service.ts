import { io, Socket } from 'socket.io-client';
import { executeSilentRefresh } from '@/lib/api-client';

let socketInstance: Socket | null = null;
let connectingPromise: Promise<Socket | null> | null = null;
let currentSocketUserId: string | null = null;

function getActiveToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('olx_access_token') || localStorage.getItem('token');
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
    if (!activeToken) {
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
        auth: { token: activeToken, accessToken: activeToken },
        query: { token: activeToken },
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

