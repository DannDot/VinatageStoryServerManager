import React, { useState, useEffect } from 'react';
import { Users, Clock, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

interface Player {
  id: number;
  name: string;
  uid: string | null;
  ip: string | null;
  last_seen: string;
  is_online: number;
  total_playtime: number;
}

interface UsersPageProps {
  token: string | null;
}

const UsersPage: React.FC<UsersPageProps> = ({ token }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    fetchPlayers();

    if (socket) {
      socket.on('players-update', (updatedPlayers: Player[]) => {
        setPlayers(updatedPlayers);
      });
    }

    return () => {
      if (socket) {
        socket.off('players-update');
      }
    };
  }, [socket, token]);

  const fetchPlayers = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/players', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading players...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-500" />
          Users
        </h1>
        <div className="text-gray-400">
          Total Players: {players.length} | Online: {players.filter(p => p.is_online).length}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-gray-400">
            <thead className="bg-gray-900/50 text-gray-300 uppercase text-xs font-medium">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">UID</th>
                <th className="px-6 py-4">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No players recorded yet
                  </td>
                </tr>
              ) : (
                players.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {player.is_online ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs font-medium">
                            <Wifi className="w-3 h-3" />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-gray-500 bg-gray-700/50 px-2.5 py-1 rounded-full text-xs font-medium">
                            <WifiOff className="w-3 h-3" />
                            Offline
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{player.name}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {player.ip || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {player.uid || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        {formatDate(player.last_seen)}
                      </div>
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

export default UsersPage;
