import React from 'react';
import { LayoutDashboard, Smartphone, MapPin, LogOut, AlertOctagon, ExternalLink } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingAlertsCount: number;
  user: User;
  onOpenMobileView?: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingAlertsCount,
  user,
  onOpenMobileView,
  onLogout,
}) => {
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

        <button
          className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
          style={{ position: 'relative' }}
        >
          <AlertOctagon size={20} color={pendingAlertsCount > 0 ? '#ef4444' : undefined} />
          <span>Alertas SOS</span>
          {pendingAlertsCount > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                background: '#dc2626',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                padding: '0.15rem 0.45rem',
                borderRadius: '1rem',
                animation: 'pulse 1.5s infinite',
              }}
            >
              {pendingAlertsCount}
            </span>
          )}
        </button>
      </nav>

      {onOpenMobileView && (
        <div style={{ padding: '0 0.5rem 1rem' }}>
          <button
            onClick={onOpenMobileView}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px dashed var(--primary)',
              background: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--primary)',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <ExternalLink size={16} />
            <span>Web App Mobile</span>
          </button>
        </div>
      )}

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
