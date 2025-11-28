import React, { useState, useEffect } from 'react';
import { useServer } from '../context/ServerContext';
import { Save, RefreshCw, AlertCircle, FileJson, Settings, Users, Plus, Trash2, Lock } from 'lucide-react';

interface ConfigPageProps {
  token: string;
  onLogout: () => void;
}

const API_URL = 'http://localhost:3001/api';

interface Role {
  Code: string;
  Name: string;
  Description: string;
  Privileges: string[];
  DefaultGameMode: number;
  Color: string;
  LandClaimAllowance: number;
  LandClaimMaxAreas: number;
  [key: string]: any;
}

export const ConfigPage: React.FC<ConfigPageProps> = ({ token, onLogout }) => {
  const { selectedInstanceId } = useServer();
  const [config, setConfig] = useState<string>('');
  const [parsedConfig, setParsedConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'json' | 'ui'>('ui');
  const [activeTab, setActiveTab] = useState<'general' | 'roles'>('general');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isNewRole, setIsNewRole] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      onLogout();
      throw new Error('Unauthorized');
    }
    return res;
  };

  useEffect(() => {
    if (selectedInstanceId) {
      fetchConfig();
    }
  }, [selectedInstanceId]);

  const fetchConfig = async () => {
    if (!selectedInstanceId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${API_URL}/config/${selectedInstanceId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch config');
      }
      const data = await res.json();
      setParsedConfig(data);
      setConfig(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.message);
      setConfig('');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!selectedInstanceId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let configToSend;
      
      if (viewMode === 'json') {
        try {
          configToSend = JSON.parse(config);
        } catch (e) {
          throw new Error('Invalid JSON format');
        }
      } else {
        configToSend = parsedConfig;
      }

      const res = await authFetch(`${API_URL}/config/${selectedInstanceId}`, {
        method: 'POST',
        body: JSON.stringify({ config: configToSend })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save config');
      }
      
      // Update both states to match
      setParsedConfig(configToSend);
      setConfig(JSON.stringify(configToSend, null, 2));
      setSuccess('Configuration saved successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralChange = (key: string, value: any) => {
    setParsedConfig((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRoleSave = (role: Role) => {
    setParsedConfig((prev: any) => {
      const newRoles = [...(prev.Roles || [])];
      if (isNewRole) {
        newRoles.push(role);
      } else {
        const index = newRoles.findIndex((r: Role) => r.Code === role.Code);
        if (index !== -1) {
          newRoles[index] = role;
        }
      }
      return { ...prev, Roles: newRoles };
    });
    setEditingRole(null);
    setIsNewRole(false);
  };

  const deleteRole = (roleCode: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    setParsedConfig((prev: any) => ({
      ...prev,
      Roles: prev.Roles.filter((r: Role) => r.Code !== roleCode)
    }));
  };

  const getAdminPrivileges = () => {
    const adminRole = parsedConfig?.Roles?.find((r: Role) => r.Code === 'admin');
    return adminRole?.Privileges || [];
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

  const renderGeneralSettings = () => {
    if (!parsedConfig) return null;
    
    const generalFields = [
      { key: 'ServerName', label: 'Server Name', type: 'text' },
      { key: 'WelcomeMessage', label: 'Welcome Message', type: 'text' },
      { key: 'Port', label: 'Port', type: 'number' },
      { key: 'MaxClients', label: 'Max Players', type: 'number' },
      { key: 'Password', label: 'Server Password', type: 'text' },
      { key: 'ServerLanguage', label: 'Language', type: 'text' },
      { key: 'AllowPvP', label: 'Allow PvP', type: 'checkbox' },
      { key: 'AllowFireSpread', label: 'Allow Fire Spread', type: 'checkbox' },
      { key: 'OnlyWhitelisted', label: 'Whitelist Only', type: 'checkbox' },
      { key: 'VerifyPlayerAuth', label: 'Verify Player Auth', type: 'checkbox' },
    ];

    const advancedFields = Object.keys(parsedConfig)
      .filter(key => 
        key !== 'Roles' && 
        !generalFields.find(f => f.key === key) &&
        typeof parsedConfig[key] !== 'object'
      )
      .map(key => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').trim(),
        type: typeof parsedConfig[key] === 'boolean' ? 'checkbox' : typeof parsedConfig[key] === 'number' ? 'number' : 'text'
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded shadow">
          {generalFields.map((field) => (
            <div key={field.key} className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              {field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={parsedConfig[field.key] || false}
                  onChange={(e) => handleGeneralChange(field.key, e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              ) : (
                <input
                  type={field.type}
                  value={parsedConfig[field.key] || ''}
                  onChange={(e) => handleGeneralChange(field.key, field.type === 'number' ? parseInt(e.target.value) : e.target.value)}
                  className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded shadow">
          <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
            <h3 className="text-lg font-bold text-gray-800">Advanced Settings</h3>
            <button className="text-blue-600 text-sm hover:underline">
              {showAdvanced ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {advancedFields.map((field) => (
                <div key={field.key} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  {field.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={parsedConfig[field.key] || false}
                      onChange={(e) => handleGeneralChange(field.key, e.target.checked)}
                      className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={parsedConfig[field.key] === null ? '' : parsedConfig[field.key]}
                      onChange={(e) => handleGeneralChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                      className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRoles = () => {
    if (!parsedConfig?.Roles) return null;

    if (editingRole) {
      const allPrivileges = getAdminPrivileges();
      
      return (
        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">{isNewRole ? 'Create Role' : `Edit Role: ${editingRole.Name}`}</h3>
            <button onClick={() => setEditingRole(null)} className="text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input 
                className="w-full border p-2 rounded" 
                value={editingRole.Name} 
                onChange={e => setEditingRole({...editingRole, Name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Code</label>
              <input 
                className="w-full border p-2 rounded" 
                value={editingRole.Code} 
                onChange={e => setEditingRole({...editingRole, Code: e.target.value})}
                disabled={!isNewRole}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input 
                className="w-full border p-2 rounded" 
                value={editingRole.Description} 
                onChange={e => setEditingRole({...editingRole, Description: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Color</label>
              <input 
                className="w-full border p-2 rounded" 
                value={editingRole.Color} 
                onChange={e => setEditingRole({...editingRole, Color: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Game Mode</label>
              <select 
                className="w-full border p-2 rounded"
                value={editingRole.DefaultGameMode}
                onChange={e => setEditingRole({...editingRole, DefaultGameMode: parseInt(e.target.value)})}
              >
                <option value={0}>Guest</option>
                <option value={1}>Survival</option>
                <option value={2}>Creative</option>
                <option value={3}>Spectator</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Privileges</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 bg-gray-50 p-4 rounded border">
              {allPrivileges.map((priv: string) => (
                <label key={priv} className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={editingRole.Privileges.includes(priv)}
                    onChange={e => {
                      const newPrivs = e.target.checked 
                        ? [...editingRole.Privileges, priv]
                        : editingRole.Privileges.filter(p => p !== priv);
                      setEditingRole({...editingRole, Privileges: newPrivs});
                    }}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">{priv}</span>
                </label>
              ))}
            </div>
          </div>

          <button 
            onClick={() => handleRoleSave(editingRole)}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Save Role
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button 
            onClick={() => {
              setIsNewRole(true);
              setEditingRole({
                Code: '',
                Name: 'New Role',
                Description: '',
                Privileges: [],
                DefaultGameMode: 1,
                Color: 'White',
                LandClaimAllowance: 0,
                LandClaimMaxAreas: 0
              });
            }}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Role</span>
          </button>
        </div>
        <div className="grid gap-4">
          {parsedConfig.Roles.map((role: Role) => (
            <div key={role.Code} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-lg" style={{ color: role.Color.toLowerCase() === 'white' ? 'black' : role.Color.toLowerCase() }}>{role.Name}</h3>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">{role.Code}</span>
                </div>
                <p className="text-sm text-gray-600">{role.Description}</p>
                <div className="text-xs text-gray-500 mt-1">
                  Privileges: {role.Privileges.length} | Game Mode: {role.DefaultGameMode}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {role.Code === 'admin' ? (
                  <div title="Admin role is locked">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setIsNewRole(false);
                        setEditingRole(role);
                      }}
                      className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => deleteRole(role.Code)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Server Configuration</h1>
        <div className="flex gap-2">
          <div className="bg-gray-200 p-1 rounded flex">
            <button
              onClick={() => setViewMode('ui')}
              className={`px-3 py-1 rounded flex items-center space-x-2 ${viewMode === 'ui' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
            >
              <Settings className="w-4 h-4" />
              <span>UI View</span>
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1 rounded flex items-center space-x-2 ${viewMode === 'json' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
            >
              <FileJson className="w-4 h-4" />
              <span>JSON View</span>
            </button>
          </div>
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="flex items-center space-x-2 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={saveConfig}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Config</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {success}
        </div>
      )}

      {viewMode === 'ui' ? (
        <div className="flex-1 flex flex-col">
          <div className="flex border-b mb-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 border-b-2 flex items-center space-x-2 ${activeTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Settings className="w-4 h-4" />
              <span>General</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2 border-b-2 flex items-center space-x-2 ${activeTab === 'roles' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Users className="w-4 h-4" />
              <span>Roles</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'general' ? renderGeneralSettings() : renderRoles()}
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          <textarea
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm border rounded shadow-inner focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            spellCheck={false}
            placeholder={loading ? "Loading..." : "Server configuration JSON..."}
          />
        </div>
      )}
      
      <p className="text-sm text-gray-500 mt-2">
        Note: You may need to restart the server for changes to take effect.
      </p>
    </div>
  );
};
