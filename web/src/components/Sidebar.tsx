import React from 'react';
import { LayoutDashboard, Smartphone, MapPin, LogOut } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-title">
        <MapPin color="#2563eb" size={28} />
        <span>Central GPS</span>
      </div>

      <nav className="nav-menu">
        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard & Mapa</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          <Smartphone size={20} />
          <span>Dispositivos</span>
        </button>
      </nav>

      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{user.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{user.email}</div>
        </div>
        <button className="nav-item" onClick={onLogout} style={{ color: 'var(--danger)' }}>
          <LogOut size={20} />
          <span>Sair da Sessão</span>
        </button>
      </div>
    </div>
  );
};
