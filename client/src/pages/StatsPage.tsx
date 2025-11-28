import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Activity, Cpu, HardDrive, Server as ServerIcon } from 'lucide-react';

interface ServerStats {
  cpu: number;
  memory: number;
  disk: number;
  timestamp: number;
}

const StatsPage: React.FC = () => {
  const { socket } = useSocket();
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [history, setHistory] = useState<ServerStats[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleStats = (newStats: ServerStats) => {
      setStats(newStats);
      setHistory(prev => {
        const newHistory = [...prev, newStats];
        if (newHistory.length > 60) newHistory.shift(); // Keep last 60 updates (approx 2 mins)
        return newHistory;
      });
    };

    socket.on('server-stats', handleStats);

    return () => {
      socket.off('server-stats', handleStats);
    };
  }, [socket]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Activity className="w-16 h-16 mb-4 animate-pulse" />
        <p className="text-xl">Waiting for server stats...</p>
        <p className="text-sm mt-2">Make sure the server is running.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Activity className="w-6 h-6" />
        Server Statistics
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* CPU Usage */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              CPU Usage
            </h2>
            <span className="text-2xl font-bold text-blue-600">{stats.cpu.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(stats.cpu, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <ServerIcon className="w-5 h-5 text-green-500" />
              Memory Usage
            </h2>
            <span className="text-2xl font-bold text-green-600">{formatBytes(stats.memory)}</span>
          </div>
          {/* No progress bar for memory as we don't know total system memory easily without more backend work, 
              but we could assume a safe max or just show the value. 
              Let's just show the value for now. */}
        </div>

        {/* Disk Usage */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-purple-500" />
              Disk Usage (Data)
            </h2>
            <span className="text-2xl font-bold text-purple-600">{formatBytes(stats.disk)}</span>
          </div>
          <p className="text-sm text-gray-500">Size of server-data directory</p>
        </div>
      </div>

      {/* Simple History Chart (SVG) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">CPU History (Last 2 Minutes)</h2>
        <div className="h-64 w-full flex items-end space-x-1">
          {history.map((point, i) => (
            <div 
              key={i}
              className="bg-blue-200 hover:bg-blue-300 flex-1 rounded-t transition-all duration-300"
              style={{ height: `${Math.min(point.cpu, 100)}%` }}
              title={`CPU: ${point.cpu.toFixed(1)}%`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
