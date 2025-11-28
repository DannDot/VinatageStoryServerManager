import { useState, useEffect } from 'react';
import { ServerManager } from './components/ServerManager';
import { Login } from './components/Login';
import { ChangePassword } from './components/ChangePassword';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) setToken(storedToken);
  }, []);

  const handleLogin = (newToken: string, changeRequired: boolean) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setMustChangePassword(changeRequired);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setMustChangePassword(false);
  };

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  if (mustChangePassword) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <ChangePassword token={token} onSuccess={handlePasswordChanged} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <ServerManager token={token} onLogout={handleLogout} />
    </div>
  );
}

export default App;
