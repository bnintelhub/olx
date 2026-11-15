import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Returns the singleton Socket.IO client instance for the Admin Portal.
 * Connects securely with HTTP-only cookies and automatic failover.
 */
export function getAdminSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
    });

    socket.on('connect', () => {
      console.log('⚡ [Admin Socket] Connected with ID:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Admin Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ [Admin Socket] Connection error:', err.message);
    });
  }
  return socket;
}

