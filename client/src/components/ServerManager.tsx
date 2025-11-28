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

export const ServerManager: React.FC = () => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [status, setStatus] = useState<string>('stopped');
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

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
      const res = await fetch(`${API_URL}/versions`);
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
      await fetch(`${API_URL}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: selectedVersion })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const stopServer = async () => {
    try {
      await fetch(`${API_URL}/stop`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Vintage Story Server Manager</h1>
      
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
    </div>
  );
};
