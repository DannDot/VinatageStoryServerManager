import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useServer } from '../context/ServerContext';
import { Play, Square, Send, Terminal } from 'lucide-react';

interface ConsolePageProps {
  token: string;
  onLogout: () => void;
}

const API_URL = '/api';

export const ConsolePage: React.FC<ConsolePageProps> = ({ token, onLogout }) => {
  const { logs, status } = useSocket();
  const { selectedInstanceId } = useServer();
  const [command, setCommand] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [instanceName, setInstanceName] = useState<string>('');

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
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (selectedInstanceId) {
      fetchInstanceDetails();
    }
  }, [selectedInstanceId]);

  const fetchInstanceDetails = async () => {
    try {
      // We need an endpoint to get a single instance, or filter from list
      // For now, let's assume we can get it from the list
      const res = await authFetch(`${API_URL}/instances`);
      const instances = await res.json();
      const instance = instances.find((i: any) => i.id === selectedInstanceId);
      if (instance) setInstanceName(instance.name);
    } catch (err) {
      console.error(err);
    }
  };

  const startServer = async () => {
    if (!selectedInstanceId) return;
    try {
      await authFetch(`${API_URL}/start`, {
        method: 'POST',
        body: JSON.stringify({ instanceId: selectedInstanceId })
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

  if (!selectedInstanceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Terminal className="w-16 h-16 mb-4" />
        <p className="text-xl">No instance selected.</p>
        <p>Please go to the Instances page to select a server.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      <div className="bg-white p-4 rounded shadow mb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{instanceName || 'Loading...'}</h2>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`w-3 h-3 rounded-full ${status === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-600 capitalize">{status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startServer}
            disabled={status === 'running'}
            className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            <span>Start</span>
          </button>
          <button
            onClick={stopServer}
            disabled={status !== 'running'}
            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square className="w-4 h-4" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-black text-green-400 p-4 rounded shadow-inner overflow-y-auto font-mono text-sm mb-4 min-h-[300px]">
        {logs.length === 0 && <div className="text-gray-500 italic">Server logs will appear here...</div>}
        {logs.map((log, i) => (
          <div key={i} className="whitespace-pre-wrap break-words">{log}</div>
        ))}
        <div ref={logsEndRef} />
      </div>

      <form onSubmit={sendCommand} className="flex gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter server command..."
          className="flex-1 border p-2 rounded shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={status !== 'running'}
        />
        <button 
          type="submit" 
          disabled={status !== 'running' || !command}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
