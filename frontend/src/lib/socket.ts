import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (token?: string): Socket => {
  if (socket?.connected) return socket;
  socket = io('/', {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  socket.on('connect_error', e => console.warn('Socket error:', e.message));
  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) return connectSocket();
  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
