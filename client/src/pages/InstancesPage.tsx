import React from 'react';
import { InstanceManager } from '../components/InstanceManager';
import { VersionManager } from '../components/VersionManager';
import { useServer } from '../context/ServerContext';

interface InstancesPageProps {
  token: string;
  onLogout: () => void;
}

export const InstancesPage: React.FC<InstancesPageProps> = ({ token, onLogout }) => {
  const { selectedInstanceId, setSelectedInstanceId } = useServer();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Instance Management</h1>
      
      <InstanceManager 
        token={token} 
        onSelectInstance={(instance) => setSelectedInstanceId(instance.id)} 
        selectedInstanceId={selectedInstanceId}
      />

      <VersionManager token={token} onLogout={onLogout} />
    </div>
  );
};
