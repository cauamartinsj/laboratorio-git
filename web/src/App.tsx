import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { MapView } from './components/MapView';
import { HistoryModal } from './components/HistoryModal';
import { AlertsManager } from './components/AlertsManager';
import { MobileApp } from './components/MobileApp';
import { api } from './api';
import { Device, User, Alert } from './types';
import { Smartphone, Radio, AlertTriangle, RefreshCw, History, AlertOctagon, CheckSquare, Square } from 'lucide-react';

export const App: React.FC = () => {
  // Verificação de rota ou modo mobile vs central
  const isMobilePath = window.location.pathname.startsWith('/mobile') || window.location.hash === '#mobile';
  const [viewMode, setViewMode] = useState<'central' | 'mobile'>(isMobilePath ? 'mobile' : 'central');

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Seleção múltipla de dispositivos para o mapa
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all');
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);

  // Áudio para alertas de emergência sonoros
  const audioContextRef = useRef<AudioContext | null>(null);
  const prevPendingAlertsCount = useRef<number>(0);

  const playEmergencySound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Alerta sonoro não pôde ser reproduzido:', e);
    }
  };

  const fetchDevices = async () => {
    if (!user || user.role !== 'ADMIN') return;
    try {
      const res = await api.get('/devices');
      setDevices(res.data);
    } catch (err) {
      console.error('Erro ao carregar dispositivos', err);
    }
  };

  const fetchAlerts = async () => {
    if (!user || user.role !== 'ADMIN') return;
    try {
      const res = await api.get('/alerts');
      const newAlerts: Alert[] = res.data;
      const pendingCount = newAlerts.filter((a) => a.status === 'PENDING').length;

      // Disparar som se surgiram novos alertas pendentes
      if (pendingCount > prevPendingAlertsCount.current) {
        playEmergencySound();
      }
      prevPendingAlertsCount.current = pendingCount;
      setAlerts(newAlerts);
    } catch (err) {
      console.error('Erro ao carregar alertas', err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN' && viewMode === 'central') {
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      fetchDevices();
      fetchAlerts();
      const interval = setInterval(() => {
        fetchDevices();
        fetchAlerts();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [user, viewMode]);

  const getDeviceStatus = (device: Device): 'active' | 'stale' | 'stopped' => {
    if (!device.trackingActive) return 'stopped';
    if (!device.lastLocation) return 'stale';

    const lastTime = new Date(device.lastLocation.collectedAt).getTime();
    const diffSeconds = (Date.now() - lastTime) / 1000;

    return diffSeconds > 60 ? 'stale' : 'active';
  };

  // Se o usuário selecionou o modo Web App Mobile
  if (viewMode === 'mobile') {
    return <MobileApp onSwitchToCentral={() => setViewMode('central')} />;
  }

  // Se não estiver logado na central administrativa
  if (!user) {
    return (
      <div>
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100 }}>
          <button
            onClick={() => setViewMode('mobile')}
            className="user-badge"
            style={{ cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
          >
            <Smartphone size={16} color="var(--primary)" />
            <span>Abrir Web App Mobile</span>
          </button>
        </div>
        <Login onLoginSuccess={(u) => setUser(u)} />
      </div>
    );
  }

  const activeCount = devices.filter((d) => getDeviceStatus(d) === 'active').length;
  const staleCount = devices.filter((d) => getDeviceStatus(d) === 'stale').length;
  const pendingAlerts = alerts.filter((a) => a.status === 'PENDING');

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectDevice = (id: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const selectAllDevices = () => {
    if (selectedDeviceIds.length === devices.length) {
      setSelectedDeviceIds([]);
    } else {
      setSelectedDeviceIds(devices.map((d) => d.id));
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingAlertsCount={pendingAlerts.length}
        user={user}
        onOpenMobileView={() => setViewMode('mobile')}
        onLogout={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
        }}
      />

      <div className="main-content">
        <div className="header">
          <div>
            <h1 className="header-title">
              {activeTab === 'dashboard'
                ? 'Painel de Monitoramento'
                : activeTab === 'alerts'
                ? 'Central de Alertas de Emergência (SOS)'
                : 'Lista de Dispositivos'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Acompanhamento de localização GPS em tempo real e resposta a emergências
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                fetchDevices();
                fetchAlerts();
              }}
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

        {/* Banner de Alerta Crítico quando houver SOS pendente */}
        {pendingAlerts.length > 0 && (
          <div
            onClick={() => setActiveTab('alerts')}
            style={{
              cursor: 'pointer',
              background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
              color: '#fff',
              padding: '1rem 1.25rem',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
              animation: 'pulse 2s infinite',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertOctagon size={28} />
              <div>
                <strong style={{ fontSize: '1.05rem', display: 'block' }}>
                  {pendingAlerts.length} ALERTA(S) DE EMERGÊNCIA PENDENTE(S)!
                </strong>
                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Último alerta: "{pendingAlerts[0].message}" de {pendingAlerts[0].user.name}
                </span>
              </div>
            </div>
            <button
              style={{
                background: '#fff',
                color: '#dc2626',
                border: 'none',
                fontWeight: 'bold',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Ver Alertas
            </button>
          </div>
        )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.125rem' }}>Mapa em Tempo Real</h3>

                {/* Controles de visualização de múltiplos dispositivos */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setFilterMode('all')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border)',
                      background: filterMode === 'all' ? 'var(--primary)' : 'var(--bg-card)',
                      color: filterMode === 'all' ? '#fff' : 'var(--text-main)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Ver Todos ({devices.filter(d => d.lastLocation).length})
                  </button>
                  <button
                    onClick={() => setFilterMode('selected')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border)',
                      background: filterMode === 'selected' ? 'var(--primary)' : 'var(--bg-card)',
                      color: filterMode === 'selected' ? '#fff' : 'var(--text-main)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Ver Selecionados ({selectedDeviceIds.length})
                  </button>
                </div>
              </div>

              <MapView
                devices={devices}
                selectedDeviceIds={selectedDeviceIds}
                filterMode={filterMode}
                activeAlerts={alerts}
                focusedLocation={focusedLocation}
                getDeviceStatus={getDeviceStatus}
              />
            </div>
          </>
        )}

        {activeTab === 'alerts' && (
          <AlertsManager
            alerts={alerts}
            onAlertUpdated={fetchAlerts}
            onLocateAlert={(alert) => {
              if (alert.latitude && alert.longitude) {
                setFocusedLocation([alert.latitude, alert.longitude]);
                setActiveTab('dashboard');
              }
            }}
          />
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
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <button
                      onClick={selectAllDevices}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      title="Selecionar / Deselecionar Todos"
                    >
                      {selectedDeviceIds.length === devices.length && devices.length > 0 ? (
                        <CheckSquare size={18} color="var(--primary)" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
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
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Nenhum dispositivo encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => {
                    const status = getDeviceStatus(device);
                    const loc = device.lastLocation;
                    const isSelected = selectedDeviceIds.includes(device.id);

                    return (
                      <tr key={device.id} style={{ background: isSelected ? 'rgba(37, 99, 235, 0.05)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => toggleSelectDevice(device.id)}
                            style={{ background: 'none', border: 'none', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                          >
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        </td>
                        <td>
                          <strong>{device.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {device.model || 'Navegador Web/Mobile'}
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
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {loc && (
                              <button
                                onClick={() => {
                                  setFocusedLocation([loc.latitude, loc.longitude]);
                                  setActiveTab('dashboard');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '0.375rem',
                                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                  color: '#2563eb',
                                  border: '1px solid rgba(37, 99, 235, 0.2)',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  fontSize: '0.8rem',
                                }}
                              >
                                Focar no Mapa
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedDevice(device)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '0.375rem',
                                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                                color: '#2563eb',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                              }}
                            >
                              <History size={15} />
                              Trajeto
                            </button>
                          </div>
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
