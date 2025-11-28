import React, { createContext, useContext, useState, useEffect } from 'react';

interface ServerContextType {
  selectedInstanceId: number | null;
  setSelectedInstanceId: (id: number | null) => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(() => {
    const saved = localStorage.getItem('selectedInstanceId');
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    if (selectedInstanceId) {
      localStorage.setItem('selectedInstanceId', selectedInstanceId.toString());
    } else {
      localStorage.removeItem('selectedInstanceId');
    }
  }, [selectedInstanceId]);

  return (
    <ServerContext.Provider value={{ selectedInstanceId, setSelectedInstanceId }}>
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
};
