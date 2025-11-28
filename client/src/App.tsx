import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { ChangePassword } from './components/ChangePassword';
import Layout from './components/Layout';
import { ConsolePage } from './pages/ConsolePage';
import { InstancesPage } from './pages/InstancesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConfigPage } from './pages/ConfigPage';
import ModsPage from './pages/ModsPage';
import BackupsPage from './pages/BackupsPage';
import { SocketProvider } from './context/SocketContext';
import { ServerProvider } from './context/ServerContext';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (token) {
      // Verify token validity if needed, or just rely on 401s
    }
  }, [token]);

  const handleLogin = (newToken: string, changeRequired: boolean) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    setMustChangePassword(changeRequired);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setMustChangePassword(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  if (mustChangePassword) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <ChangePassword 
            token={token} 
            onLogout={handleLogout} 
            onSuccess={() => setMustChangePassword(false)} 
          />
        </div>
      </div>
    );
  }

  return (
    <SocketProvider>
      <ServerProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Layout onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<ConsolePage token={token} onLogout={handleLogout} />} />
              <Route path="/instances" element={<InstancesPage token={token} onLogout={handleLogout} />} />
              <Route path="/config" element={<ConfigPage token={token} onLogout={handleLogout} />} />
              <Route path="/mods" element={<ModsPage token={token} onLogout={handleLogout} />} />
              <Route path="/backups" element={<BackupsPage token={token} onLogout={handleLogout} />} />
              <Route path="/settings" element={<SettingsPage token={token} onLogout={handleLogout} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </ServerProvider>
    </SocketProvider>
  );
}

export default App;
