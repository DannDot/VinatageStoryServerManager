import React, { useState, useEffect } from 'react';
import { useServer } from '../context/ServerContext';
import { Archive, RotateCcw, Trash2, Plus, AlertCircle } from 'lucide-react';

interface BackupsPageProps {
  token: string | null;
  onLogout?: () => void;
}

interface Backup {
  filename: string;
  size: number;
  createdAt: string;
}

const BackupsPage: React.FC<BackupsPageProps> = ({ token }) => {
  const { selectedInstanceId } = useServer();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (selectedInstanceId && token) {
      fetchBackups();
    }
  }, [selectedInstanceId, token]);

  const fetchBackups = async () => {
    if (!selectedInstanceId || !token) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/backups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!selectedInstanceId || !token) return;
    setCreating(true);
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/backups`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchBackups();
        alert('Backup created successfully');
      } else {
        alert('Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!selectedInstanceId || !token) return;
    if (!confirm(`Are you sure you want to restore ${filename}? This will overwrite current server data and restart the server if running.`)) return;
    
    setRestoring(filename);
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/backups/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename }),
      });
      if (response.ok) {
        alert('Backup restored successfully');
      } else {
        alert('Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Failed to restore backup');
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!selectedInstanceId || !token || !confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/backups/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchBackups();
      } else {
        alert('Failed to delete backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!selectedInstanceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <AlertCircle className="w-16 h-16 mb-4" />
        <p className="text-xl">No instance selected.</p>
        <p>Please go to the Instances page to select a server.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Backups</h1>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className={`w-4 h-4 ${creating ? 'animate-spin' : ''}`} />
          <span>{creating ? 'Creating Backup...' : 'Create Backup'}</span>
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading backups...</td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No backups found</td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.filename}>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium flex items-center gap-2">
                      <Archive className="w-4 h-4 text-gray-400" />
                      {backup.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatSize(backup.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatDate(backup.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRestore(backup.filename)}
                        disabled={restoring === backup.filename}
                        className="text-blue-600 hover:text-blue-800 p-2 mr-2"
                        title="Restore"
                      >
                        <RotateCcw className={`w-5 h-5 ${restoring === backup.filename ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(backup.filename)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Delete"
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
    </div>
  );
};

export default BackupsPage;
