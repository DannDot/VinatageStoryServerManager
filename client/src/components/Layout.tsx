import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Server, Settings, LogOut, Terminal, HardDrive } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Console', href: '/', icon: Terminal },
    { name: 'Instances', href: '/instances', icon: HardDrive },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Server className="h-6 w-6" />
          <span className="font-bold text-lg">VS Manager</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-gray-800 text-white absolute top-16 left-0 w-full z-50 shadow-lg">
          <nav className="flex flex-col p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-2 p-2 rounded ${
                  isActive(item.href) ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700 text-red-400"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-gray-800 text-white min-h-screen">
        <div className="p-4 flex items-center space-x-2 border-b border-gray-700">
          <Server className="h-6 w-6" />
          <span className="font-bold text-lg">VS Manager</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-2 p-2 rounded ${
                isActive(item.href) ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700 text-red-400 w-full"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        {children}
      </main>
    </div>
  );
};

export default Layout;
