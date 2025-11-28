import React, { useState } from 'react';

interface ChangePasswordProps {
  token: string;
  onSuccess?: () => void;
  onLogout?: () => void;
  isForced?: boolean;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ token, onSuccess, onLogout, isForced = true }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: password })
      });
      
      if (!res.ok) throw new Error('Failed to change password');
      
      setMessage('Password changed successfully');
      setError('');
      setPassword('');
      setConfirm('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Error changing password');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded shadow">
      <h2 className={`text-2xl font-bold mb-6 text-center ${isForced ? 'text-red-600' : 'text-gray-800'}`}>
        {isForced ? 'Change Default Password' : 'Change Password'}
      </h2>
      {isForced && <p className="mb-4 text-gray-600">You are using the default password. Please change it to continue.</p>}
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New Password"
          className="w-full border p-2 rounded mb-4 text-gray-800"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm Password"
          className="w-full border p-2 rounded mb-4 text-gray-800"
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Change Password
        </button>
      </form>
      
      {onLogout && (
        <button onClick={onLogout} className="mt-4 w-full text-gray-500 hover:text-gray-700 text-sm">
          Logout
        </button>
      )}
    </div>
  );
};
