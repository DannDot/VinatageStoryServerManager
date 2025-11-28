import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const API_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';
const socket = io(SOCKET_URL);

interface Version {
  version: string;
  type: 'stable' | 'unstable';
  url: string;
  filename: string;
  installed: boolean;
}

interface ServerManagerProps {
  token: string;
  onLogout: () => void;
}

export const ServerManager: React.FC<ServerManagerProps> = ({ token, onLogout }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [status, setStatus] = useState<string>('stopped');
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      onLogout();
      throw new Error('Unauthorized');
    }
    return res;
  };

  useEffect(() => {
    fetchVersions();
    
    socket.on('console-log', (log: string) => {
      setLogs(prev => [...prev, log]);
    });

    socket.on('server-status', (newStatus: string) => {
      setStatus(newStatus);
    });

    return () => {
      socket.off('console-log');
      socket.off('server-status');
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchVersions = async () => {
    try {
      const res = await authFetch(`${API_URL}/versions`);
      const data = await res.json();
      setVersions(data);
      if (data.length > 0 && !selectedVersion) setSelectedVersion(data[0].version);
    } catch (err) {
      console.error(err);
    }
  };

  const installVersion = async (version: string) => {
    setLoading(true);
    try {
      await authFetch(`${API_URL}/install`, {
        method: 'POST',
        body: JSON.stringify({ version })
      });
      await fetchVersions();
      alert(`Version ${version} installed!`);
    } catch (err) {
      alert('Install failed');
    } finally {
      setLoading(false);
    }
  };

  const startServer = async () => {
    try {
      await authFetch(`${API_URL}/start`, {
        method: 'POST',
        body: JSON.stringify({ version: selectedVersion })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const stopServer = async () => {
    try {
      await authFetch(`${API_URL}/stop`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  const sendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command) return;
    
    try {
      await authFetch(`${API_URL}/command`, {
        method: 'POST',
        body: JSON.stringify({ command })
      });
      setCommand('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Vintage Story Server Manager</h1>
        <button onClick={onLogout} className="text-sm text-red-600 hover:underline">Logout</button>
      </div>
      
      <div className="mb-6 bg-white p-4 rounded shadow text-gray-800">
        <h2 className="text-xl font-semibold mb-2">Server Control</h2>
        <div className="flex gap-4 items-center flex-wrap">
          <select 
            value={selectedVersion} 
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="border p-2 rounded"
          >
            {versions.map(v => (
              <option key={v.version} value={v.version}>
                {v.version} ({v.type}) {v.installed ? '✓' : ''}
              </option>
            ))}
          </select>
          
          {versions.find(v => v.version === selectedVersion)?.installed ? (
            <>
              <button 
                onClick={startServer} 
                disabled={status === 'running'}
                className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-green-600"
              >
                Start
              </button>
              <button 
                onClick={stopServer} 
                disabled={status !== 'running'}
                className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-red-600"
              >
                Stop
              </button>
            </>
          ) : (
            <button 
              onClick={() => installVersion(selectedVersion)} 
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-600"
            >
              {loading ? 'Installing...' : 'Install'}
            </button>
          )}
          
          <span className="ml-auto font-mono font-bold">Status: {status}</span>
        </div>
      </div>

      <div className="bg-black text-green-400 p-4 rounded h-96 overflow-y-auto font-mono text-sm shadow-inner">
        {logs.length === 0 && <div className="text-gray-500 italic">Server logs will appear here...</div>}
        {logs.map((log, i) => (
          <div key={i} className="whitespace-pre-wrap">{log}</div>
        ))}
        <div ref={logsEndRef} />
      </div>

      <form onSubmit={sendCommand} className="mt-4 flex gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter server command..."
          className="flex-1 border p-2 rounded shadow-sm"
          disabled={status !== 'running'}
        />
        <button 
          type="submit" 
          disabled={status !== 'running' || !command}
          className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
};
