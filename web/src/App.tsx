import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { MapView } from './components/MapView';
import { HistoryModal } from './components/HistoryModal';
import { api } from './api';
import { Device, User } from './types';
import { Smartphone, Radio, AlertTriangle, RefreshCw, History } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDevices = async () => {
    if (!user) return;
    try {
      const res = await api.get('/devices');
      setDevices(res.data);
    } catch (err) {
      console.error('Erro ao carregar dispositivos', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDevices();
      const interval = setInterval(fetchDevices, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const getDeviceStatus = (device: Device): 'active' | 'stale' | 'stopped' => {
    if (!device.trackingActive) return 'stopped';

    if (!device.lastLocation) return 'stale';

    const lastTime = new Date(device.lastLocation.collectedAt).getTime();
    const diffSeconds = (Date.now() - lastTime) / 1000;

    return diffSeconds > 60 ? 'stale' : 'active';
  };

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  const activeCount = devices.filter((d) => getDeviceStatus(d) === 'active').length;
  const staleCount = devices.filter((d) => getDeviceStatus(d) === 'stale').length;

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={() => {
          localStorage.clear();
          setUser(null);
        }}
      />

      <div className="main-content">
        <div className="header">
          <div>
            <h1 className="header-title">
              {activeTab === 'dashboard' ? 'Painel de Monitoramento' : 'Lista de Dispositivos'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Acompanhamento de localização GPS em tempo real
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={fetchDevices}
              className="user-badge"
              style={{ cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
            >
              <RefreshCw size={16} />
              <span>Atualizar</span>
            </button>
            <div className="user-badge">
              <span>Admin: <strong>{user.name}</strong></span>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)', color: '#2563eb' }}>
              <Smartphone size={24} />
            </div>
            <div>
              <div className="stat-value">{devices.length}</div>
              <div className="stat-label">Total Cadastrados</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
              <Radio size={24} />
            </div>
            <div>
              <div className="stat-value">{activeCount}</div>
              <div className="stat-label">Rastreando Agora (Ativos)</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="stat-value">{staleCount}</div>
              <div className="stat-label">Sem Atualização (&gt; 60s)</div>
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Mapa em Tempo Real</h3>
              <MapView devices={devices} getDeviceStatus={getDeviceStatus} />
            </div>
          </>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem' }}>Dispositivos Cadastrados</h3>
            <input
              type="text"
              placeholder="Filtrar por nome ou usuário..."
              className="form-input"
              style={{ width: '280px', padding: '0.5rem 0.75rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Usuário</th>
                  <th>Status do Rastreamento</th>
                  <th>Última Localização (Lat, Long)</th>
                  <th>Última Atualização</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Nenhum dispositivo encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => {
                    const status = getDeviceStatus(device);
                    const loc = device.lastLocation;

                    return (
                      <tr key={device.id}>
                        <td>
                          <strong>{device.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {device.model || 'Modelo genérico'}
                          </div>
                        </td>
                        <td>
                          <div>{device.user.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{device.user.email}</div>
                        </td>
                        <td>
                          {status === 'active' && <span className="badge badge-active">🟢 Ativo</span>}
                          {status === 'stale' && <span className="badge badge-stale">🟡 Sem Atualização (&gt;60s)</span>}
                          {status === 'stopped' && <span className="badge badge-stopped">🔴 Interrompido</span>}
                        </td>
                        <td>
                          {loc ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}` : 'Sem dados'}
                        </td>
                        <td>
                          {loc ? new Date(loc.collectedAt).toLocaleString('pt-BR') : 'Nunca'}
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedDevice(device)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '0.375rem',
                              backgroundColor: 'rgba(37, 99, 235, 0.2)',
                              color: '#2563eb',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '0.875rem',
                            }}
                          >
                            <History size={16} />
                            Histórico
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedDevice && (
        <HistoryModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
    </div>
  );
};
