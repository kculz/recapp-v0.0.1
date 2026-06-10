import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { userToken, apiUrl } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!userToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Strip '/api/v1' to obtain the root socket connection URL
    const socketUrl = apiUrl.replace('/api/v1', '');
    console.log(`[Socket] Connecting client to URL: ${socketUrl}`);

    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token: userToken }
    });

    newSocket.on('connect', () => {
      console.log(`[Socket] Client connection active. ID: ${newSocket.id}`);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Socket] Connection handshake failed:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userToken, apiUrl]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
