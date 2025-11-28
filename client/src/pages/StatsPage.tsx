import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Activity, Cpu, HardDrive, Server as ServerIcon, AlertCircle } from 'lucide-react';

interface ServerStats {
  cpu: number;
  memory: number;
  totalMemory: number;
  disk: number;
  timestamp: number;
}

interface StatsPageProps {
  token: string | null;
  onLogout?: () => void;
}

const AreaChart = ({ data, dataKey, color, height = 200, maxValue = 100 }: { 
  data: any[], 
  dataKey: string, 
  color: string, 
  height?: number, 
  maxValue?: number
}) => {
  if (data.length < 2) return <div style={{ height }} className="w-full bg-gray-50 rounded flex items-center justify-center text-gray-400">Collecting data...</div>;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const val = d[dataKey];
    // Ensure value doesn't exceed max for drawing purposes
    const normalizedVal = Math.min(Math.max(val, 0), maxValue);
    const y = 100 - (normalizedVal / maxValue) * 100;
    return `${x},${y}`;
  }).join(' ');

  // Close the path for the area fill
  const areaPath = `M 0,100 L ${points.replace(/ /g, ' L ')} L 100,100 Z`;
  const linePath = `M ${points.replace(/ /g, ' L ')}`;

  return (
    <div className="w-full relative" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {/* Grid lines */}
        <line x1="0" y1="0" x2="100" y2="0" stroke="#f3f4f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="25" x2="100" y2="25" stroke="#f3f4f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#f3f4f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="100" x2="100" y2="100" stroke="#f3f4f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <path d={areaPath} fill={`url(#gradient-${color})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const StatsPage: React.FC<StatsPageProps> = ({ token }) => {
  const { socket } = useSocket();
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [serverStatus, setServerStatus] = useState<string>('unknown');

  useEffect(() => {
    const fetchStatus = async () => {
      if (!token) return;
      try {
        const response = await fetch('/api/server-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setServerStatus(data.status);
        }
      } catch (error) {
        console.error('Error fetching server status:', error);
      }
    };

    fetchStatus();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleStats = (newStats: ServerStats) => {
      setStats(newStats);
      setServerStatus('running');
      setHistory(prev => {
        const memoryPercentage = (newStats.memory / newStats.totalMemory) * 100;
        const point = { ...newStats, memoryPercentage };
        const newHistory = [...prev, point];
        if (newHistory.length > 60) newHistory.shift(); // Keep last 60 updates (approx 2 mins)
        return newHistory;
      });
    };

    const handleStatus = (status: any) => {
      setServerStatus(status.status);
      if (status.status !== 'running') {
        setStats(null);
      }
    };

    socket.on('server-stats', handleStats);
    socket.on('server-status', handleStatus);

    return () => {
      socket.off('server-stats', handleStats);
      socket.off('server-status', handleStatus);
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
        {serverStatus === 'running' ? (
            <>
                <Activity className="w-16 h-16 mb-4 animate-pulse" />
                <p className="text-xl">Waiting for server stats...</p>
            </>
        ) : (
            <>
                <AlertCircle className="w-16 h-16 mb-4" />
                <p className="text-xl">Server is not running</p>
                <p className="text-sm mt-2">Start the server to view statistics.</p>
            </>
        )}
      </div>
    );
  }

  const memoryPercentage = (stats.memory / stats.totalMemory) * 100;

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
            <div className="text-right">
              <span className="text-2xl font-bold text-green-600">{memoryPercentage.toFixed(1)}%</span>
              <p className="text-xs text-gray-500">{formatBytes(stats.memory)} / {formatBytes(stats.totalMemory)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(memoryPercentage, 100)}%` }}
            ></div>
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU History Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">CPU History (Last 2 Minutes)</h2>
          <AreaChart 
            data={history} 
            dataKey="cpu" 
            color="#2563eb" 
            maxValue={100} 
          />
        </div>

        {/* Memory History Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Memory History (Last 2 Minutes)</h2>
          <AreaChart 
            data={history} 
            dataKey="memoryPercentage" 
            color="#16a34a" 
            maxValue={100} 
          />
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
