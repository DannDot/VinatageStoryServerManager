import React, { useState, useEffect } from 'react';
import { useServer } from '../context/ServerContext';
import { Package, Search, Download, Trash2, Upload } from 'lucide-react';

interface ModsPageProps {
  token: string | null;
  onLogout?: () => void;
}

interface Mod {
  modid: number;
  assetid: number;
  name: string;
  text: string;
  author: string;
  version: string;
  downloads: number;
  comments: number;
  created: string;
  lastmodified: string;
  url: string; // url alias
}

interface InstalledMod {
  filename: string;
  modinfo?: {
    modid: string;
    name: string;
    version: string;
    description: string;
    authors: string[];
  };
}

const ModsPage: React.FC<ModsPageProps> = ({ token }) => {
  const { selectedInstanceId } = useServer();
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [availableMods, setAvailableMods] = useState<Mod[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'installed' | 'browse'>('installed');

  useEffect(() => {
    if (selectedInstanceId && token) {
      fetchInstalledMods();
    }
  }, [selectedInstanceId, token]);

  useEffect(() => {
    if (activeTab === 'browse' && availableMods.length === 0 && token) {
      fetchAvailableMods();
    }
  }, [activeTab, token]);

  const fetchInstalledMods = async () => {
    if (!selectedInstanceId || !token) return;
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/mods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setInstalledMods(data);
      }
    } catch (error) {
      console.error('Error fetching installed mods:', error);
    }
  };

  const fetchAvailableMods = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch('/api/mods/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableMods(data);
      }
    } catch (error) {
      console.error('Error fetching available mods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (mod: Mod) => {
    if (!selectedInstanceId || !token) return;
    setInstalling(mod.modid);
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/mods/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modId: mod.modid }),
      });
      if (response.ok) {
        await fetchInstalledMods();
        alert(`Successfully installed ${mod.name}`);
      } else {
        const error = await response.json();
        alert(`Failed to install mod: ${error.error}`);
      }
    } catch (error) {
      console.error('Error installing mod:', error);
      alert('Failed to install mod');
    } finally {
      setInstalling(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!selectedInstanceId || !token || !confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/mods/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchInstalledMods();
      } else {
        alert('Failed to delete mod');
      }
    } catch (error) {
      console.error('Error deleting mod:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedInstanceId || !token || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/mods/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        fetchInstalledMods();
        alert('Mod uploaded successfully');
      } else {
        const error = await response.json();
        alert(`Failed to upload mod: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading mod:', error);
      alert('Failed to upload mod');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const filteredMods = availableMods.filter(mod => 
    (mod.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (mod.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (mod.author || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedInstanceId) {
    return <div className="p-4 text-center text-gray-400">Please select an instance first.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Mod Manager</h1>
      </div>

      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 border-b-2 flex items-center space-x-2 ${activeTab === 'installed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('installed')}
        >
          <Package className="w-4 h-4" />
          <span>Installed Mods</span>
        </button>
        <button
          className={`px-4 py-2 border-b-2 flex items-center space-x-2 ${activeTab === 'browse' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('browse')}
        >
          <Search className="w-4 h-4" />
          <span>Browse Mods</span>
        </button>
      </div>

      {activeTab === 'installed' && (
        <div className="flex-1 flex flex-col">
          <div className="mb-4 flex justify-end">
            <label className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Upload Mod (.zip)'}</span>
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="bg-white rounded shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {installedMods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No mods installed</td>
                  </tr>
                ) : (
                  installedMods.map((mod) => (
                    <tr key={mod.filename}>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        {mod.modinfo?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {mod.modinfo?.version || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {mod.modinfo?.authors?.join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                        {mod.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(mod.filename)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'browse' && (
        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search mods..."
              className="w-full bg-white text-gray-900 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading mods...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4">
              {filteredMods.map((mod) => (
                <div key={mod.modid} className="bg-white rounded shadow p-6 flex flex-col border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{mod.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">v{mod.version}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">by {mod.author}</p>
                  <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">{mod.text}</p>
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {mod.downloads}
                    </div>
                    <button
                      onClick={() => handleInstall(mod)}
                      disabled={installing === mod.modid}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        installing === mod.modid
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {installing === mod.modid ? 'Installing...' : 'Install'}
                    </button>
                  </div>
                </div>
              ))}
              {filteredMods.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-8">
                  No mods found matching your search.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModsPage;
