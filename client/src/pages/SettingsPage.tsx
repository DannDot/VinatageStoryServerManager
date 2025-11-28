import React from 'react';
import { ChangePassword } from '../components/ChangePassword';

interface SettingsPageProps {
  token: string;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ token, onLogout }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <ChangePassword token={token} onLogout={onLogout} />
    </div>
  );
};
