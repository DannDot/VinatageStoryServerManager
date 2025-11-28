import React, { useState, useEffect } from 'react';

interface Version {
  version: string;
  type: 'stable' | 'unstable';
  url: string;
  filename: string;
  installed: boolean;
}

interface VersionManagerProps {
  token: string;
  onLogout: () => void;
}

const API_URL = '/api';

export const VersionManager: React.FC<VersionManagerProps> = ({ token, onLogout }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [loading, setLoading] = useState(false);

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
  }, []);

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

  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <h3 className="font-bold mb-2 text-gray-800">Version Management</h3>
      <div className="flex gap-2 flex-wrap">
        <select 
          value={selectedVersion} 
          onChange={(e) => setSelectedVersion(e.target.value)}
          className="border p-2 rounded flex-1 min-w-[200px]"
        >
          {versions.map(v => (
            <option key={v.version} value={v.version}>
              {v.version} ({v.type}) {v.installed ? '✓' : ''}
            </option>
          ))}
        </select>
        <button 
          onClick={() => installVersion(selectedVersion)} 
          disabled={loading || versions.find(v => v.version === selectedVersion)?.installed}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-600 whitespace-nowrap"
        >
          {loading ? 'Installing...' : (versions.find(v => v.version === selectedVersion)?.installed ? 'Installed' : 'Install')}
        </button>
      </div>
    </div>
  );
};
