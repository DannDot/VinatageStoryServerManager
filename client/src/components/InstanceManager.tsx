import React, { useState, useEffect } from 'react';

interface Instance {
  id: number;
  name: string;
  version: string;
  created_at: string;
}

interface Version {
  version: string;
  installed: boolean;
}

interface InstanceManagerProps {
  token: string;
  onSelectInstance: (instance: Instance) => void;
  selectedInstanceId: number | null;
}

export const InstanceManager: React.FC<InstanceManagerProps> = ({ token, onSelectInstance, selectedInstanceId }) => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceVersion, setNewInstanceVersion] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    fetchInstances();
    fetchVersions();
  }, []);

  const fetchInstances = async () => {
    const res = await authFetch('/api/instances');
    if (res.ok) setInstances(await res.json());
  };

  const fetchVersions = async () => {
    const res = await authFetch('/api/versions');
    if (res.ok) setVersions(await res.json());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstanceName || !newInstanceVersion) return;

    const res = await authFetch('/api/instances', {
      method: 'POST',
      body: JSON.stringify({ name: newInstanceName, version: newInstanceVersion })
    });

    if (res.ok) {
      setNewInstanceName('');
      setNewInstanceVersion('');
      setShowCreate(false);
      fetchInstances();
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this server instance? All data will be lost.')) return;

    const res = await authFetch(`/api/instances/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      fetchInstances();
      if (selectedInstanceId === id) {
        // Handle deselection if needed
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Server Instances</h2>
        <button 
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
        >
          {showCreate ? 'Cancel' : '+ New Instance'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 p-4 bg-gray-50 rounded border">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Server Name</label>
              <input
                type="text"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="My Survival World"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <select
                value={newInstanceVersion}
                onChange={(e) => setNewInstanceVersion(e.target.value)}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Version</option>
                {versions.map(v => (
                  <option key={v.version} value={v.version}>
                    {v.version} {v.installed ? '(Installed)' : '(Will Install)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full">
            Create Server
          </button>
        </form>
      )}

      <div className="grid gap-3">
        {instances.map(instance => (
          <div 
            key={instance.id}
            onClick={() => onSelectInstance(instance)}
            className={`p-4 rounded border cursor-pointer transition-colors flex justify-between items-center ${
              selectedInstanceId === instance.id 
                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                : 'hover:bg-gray-50 border-gray-200'
            }`}
          >
            <div>
              <h3 className="font-bold text-gray-800">{instance.name}</h3>
              <p className="text-sm text-gray-500">Version: {instance.version}</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedInstanceId === instance.id && (
                <span className="text-blue-600 text-sm font-medium bg-blue-100 px-2 py-1 rounded">Selected</span>
              )}
              <button 
                onClick={(e) => handleDelete(instance.id, e)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Delete Server"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        {instances.length === 0 && !showCreate && (
          <p className="text-gray-500 text-center py-4">No server instances found. Create one to get started.</p>
        )}
      </div>
    </div>
  );
};
