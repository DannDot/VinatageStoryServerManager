import React, { useState, useEffect } from 'react';
import { useServer } from '../context/ServerContext';
import { Users, UserPlus, Trash2, Shield, ShieldAlert, RefreshCw } from 'lucide-react';

interface WhitelistPageProps {
  token: string | null;
}

interface WhitelistedPlayer {
  name: string;
  uid?: string;
  lastKnownName?: string;
}

interface WhitelistData {
  enabled: boolean;
  players: WhitelistedPlayer[];
}

const WhitelistPage: React.FC<WhitelistPageProps> = ({ token }) => {
  const { selectedInstanceId } = useServer();
  const [whitelistData, setWhitelistData] = useState<WhitelistData>({ enabled: false, players: [] });
  const [loading, setLoading] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedInstanceId && token) {
      fetchWhitelist();
    }
  }, [selectedInstanceId, token]);

  const fetchWhitelist = async () => {
    if (!selectedInstanceId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/whitelist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWhitelistData(data);
      } else {
        setError('Failed to fetch whitelist data');
      }
    } catch (error) {
      console.error('Error fetching whitelist:', error);
      setError('Error fetching whitelist data');
    } finally {
      setLoading(false);
    }
  };

  const toggleWhitelist = async () => {
    if (!selectedInstanceId || !token) return;
    const newMode = !whitelistData.enabled;
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/whitelist/mode`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ enabled: newMode }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setWhitelistData(prev => ({ ...prev, enabled: data.enabled }));
      }
    } catch (error) {
      console.error('Error toggling whitelist:', error);
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstanceId || !token || !newPlayerName.trim()) return;
    
    setAdding(true);
    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/whitelist`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ username: newPlayerName.trim() }),
      });

      if (response.ok) {
        setNewPlayerName('');
        fetchWhitelist();
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to add player');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      setError('Error adding player');
    } finally {
      setAdding(false);
    }
  };

  const removePlayer = async (username: string) => {
    if (!selectedInstanceId || !token) return;
    
    if (!confirm(`Are you sure you want to remove ${username} from the whitelist?`)) return;

    try {
      const response = await fetch(`/api/instances/${selectedInstanceId}/whitelist/${username}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchWhitelist();
      }
    } catch (error) {
      console.error('Error removing player:', error);
    }
  };

  if (!selectedInstanceId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select an instance to manage whitelist
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-500" />
          Whitelist Management
        </h1>
        <button 
          onClick={fetchWhitelist}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${whitelistData.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {whitelistData.enabled ? <Shield className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Whitelist Status</h3>
              <p className="text-gray-400">
                {whitelistData.enabled 
                  ? 'Only whitelisted players can join the server' 
                  : 'Anyone can join the server (Whitelist disabled)'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleWhitelist}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              whitelistData.enabled
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {whitelistData.enabled ? 'Disable Whitelist' : 'Enable Whitelist'}
          </button>
        </div>
      </div>

      {/* Add Player Card */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add Player
        </h3>
        <form onSubmit={addPlayer} className="flex gap-4">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Enter username..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={adding || !newPlayerName.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {adding ? 'Adding...' : 'Add Player'}
          </button>
        </form>
      </div>

      {/* Player List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Whitelisted Players ({whitelistData.players.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-700">
          {whitelistData.players.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No players in whitelist
            </div>
          ) : (
            whitelistData.players.map((player, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-lg font-bold text-gray-400">
                    {(player.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{player.name || 'Unknown Player'}</div>
                    {player.lastKnownName && player.lastKnownName !== player.name && (
                      <div className="text-sm text-gray-500">Last known as: {player.lastKnownName}</div>
                    )}
                    {player.uid && (
                      <div className="text-xs text-gray-600 font-mono">{player.uid}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => player.name && removePlayer(player.name)}
                  disabled={!player.name}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove from whitelist"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WhitelistPage;
