import { useEffect, useState } from 'react'
import io from 'socket.io-client'

const socket = io('/', {
  path: '/socket.io'
});

function App() {
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setStatus(data.message))
      .catch(() => setStatus('Server Offline'));

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    return () => {
      socket.off('connect');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Vintage Story Server Manager</h1>
        <p className="text-xl text-gray-400">Status: {status}</p>
      </div>
    </div>
  )
}

export default App
