import React, { useState, useEffect } from 'react';
import { useServer } from '../context/ServerContext';
import { Package, Search, Download, Trash2, Upload, RefreshCw } from 'lucide-react';

interface ModsPageProps {
  token: string | null;
  onLogout?: () => void;
}

interface Mod {
  modid: number;
  assetid: number;
  name: string;
  summary: string;
  author: string;
  version: string;
  downloads: number;
  comments: number;
  created: string;
  lastmodified: string;
  url: string; // url alias
  trendingpoints: number;
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
  
  // Pagination and Sorting state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'downloads' | 'trending' | 'name'>('newest');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (selectedInstanceId && token) {
      fetchInstalledMods();
    }
  }, [selectedInstanceId, token]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch mods when tab, sort, or search changes
  useEffect(() => {
    if (activeTab === 'browse' && token) {
      setPage(1);
      setAvailableMods([]);
      fetchAvailableMods(1, true);
    }
  }, [activeTab, sortBy, debouncedSearch, token]);

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

  const fetchAvailableMods = async (pageNum: number, reset: boolean = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        sort: sortBy,
        order: sortBy === 'name' ? 'asc' : 'desc',
        search: debouncedSearch
      });

      const response = await fetch(`/api/mods/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both new format { mods: [], total: 0 } and potential old format []
        const mods = data.mods || (Array.isArray(data) ? data : []);
        
        if (reset) {
          setAvailableMods(mods);
        } else {
          setAvailableMods(prev => [...(prev || []), ...mods]);
        }
        // If we got the full list (old server) or a full page, we might have more
        // But for old server returning all mods, we don't want to load more.
        // New server returns limit=20.
        setHasMore(mods.length === 20);
      }
    } catch (error) {
      console.error('Error fetching available mods:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAvailableMods(nextPage, false);
    }
  };

  const handleRefreshCache = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const response = await fetch('/api/mods/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setPage(1);
        setAvailableMods([]);
        fetchAvailableMods(1, true);
        alert('Mod list refreshed successfully');
      } else {
        alert('Failed to refresh mod list');
      }
    } catch (error) {
      console.error('Error refreshing cache:', error);
      alert('Failed to refresh mod list');
    } finally {
      setRefreshing(false);
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
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search mods..."
                className="w-full bg-white text-gray-900 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white text-gray-900 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest</option>
              <option value="downloads">Downloads</option>
              <option value="trending">Trending</option>
              <option value="name">Name</option>
            </select>
            <button
              onClick={handleRefreshCache}
              disabled={refreshing}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50 flex items-center gap-2"
              title="Refresh Mod Database"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {availableMods.map((mod) => (
                <div key={mod.modid} className="bg-white rounded shadow p-6 flex flex-col border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{mod.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">v{mod.version}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">by {mod.author}</p>
                  <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">{mod.summary}</p>
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
            </div>
            
            {loading && (
              <div className="text-center text-gray-500 py-8">Loading mods...</div>
            )}
            
            {!loading && availableMods.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No mods found matching your search.
              </div>
            )}

            {!loading && hasMore && availableMods.length > 0 && (
              <div className="text-center py-4">
                <button
                  onClick={loadMore}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModsPage;
