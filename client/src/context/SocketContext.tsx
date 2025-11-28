import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = '/';

interface ServerStatus {
  status: string;
  activeInstanceId: number | null;
}

interface SocketContextType {
  socket: Socket | null;
  logs: string[];
  status: string;
  activeInstanceId: number | null;
  clearLogs: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('stopped');
  const [activeInstanceId, setActiveInstanceId] = useState<number | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('console-log', (log: string) => {
      setLogs(prev => [...prev, log]);
    });

    newSocket.on('server-status', (data: ServerStatus) => {
      setStatus(data.status);
      setActiveInstanceId(data.activeInstanceId);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const clearLogs = () => setLogs([]);

  return (
    <SocketContext.Provider value={{ socket, logs, status, activeInstanceId, clearLogs }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
