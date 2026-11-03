import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Play,
  Square,
  AlertOctagon,
  LogOut,
  Send,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Lock,
  Mail,
  User as UserIcon,
  Wifi,
  WifiOff
} from 'lucide-react';
import { api } from '../api';
import { User, Device } from '../types';

const PREDEFINED_SOS_MESSAGES = [
  'Preciso de ajuda.',
  'Estou em perigo.',
  'Preciso de assistência médica.',
  'Estou em uma situação suspeita.',
  'Estou perdido e preciso de orientação.',
  'Emergência: entre em contato comigo.',
];

interface MobileAppProps {
  onSwitchToCentral?: () => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({ onSwitchToCentral }) => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mobile_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Device & Tracking state
  const [device, setDevice] = useState<Device | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // SOS state
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(PREDEFINED_SOS_MESSAGES[0]);
  const [sendingSos, setSendingSos] = useState(false);
  const [sosSuccessMessage, setSosSuccessMessage] = useState<string | null>(null);

  // Wake lock and interval references
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  // Sync token to api instance for mobile requests
  useEffect(() => {
    const token = localStorage.getItem('mobile_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [currentUser]);

  // Load or register the user's primary mobile device
  const initDevice = async () => {
    try {
      const res = await api.get('/devices');
      const userDevices: Device[] = res.data;
      if (userDevices.length > 0) {
        setDevice(userDevices[0]);
        setIsTracking(userDevices[0].trackingActive);
      } else {
        // Create initial mobile device automatically
        const createRes = await api.post('/devices', {
          name: `${currentUser?.name || 'Celular'} - Mobile Web`,
          model: navigator.userAgent.includes('Mobile') ? 'Navegador Mobile' : 'Navegador Web',
        });
        setDevice(createRes.data);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dispositivo móvel:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      initDevice();
    }
  }, [currentUser]);

  // Request Wake Lock to prevent screen sleep while tracking
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock não suportado ou bloqueado:', err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn('Erro ao liberar Wake Lock:', err);
      }
    }
  };

  // Send single coordinate update to backend
  const sendLocationUpdate = async (lat: number, lng: number, deviceId: string) => {
    try {
      await api.post(`/devices/${deviceId}/locations`, {
        latitude: lat,
        longitude: lng,
        collectedAt: new Date().toISOString(),
      });
      setLastSentAt(new Date());
      setLocationError(null);
    } catch (err: any) {
      console.error('Erro ao enviar coordenadas:', err);
      setLocationError('Falha ao comunicar com o servidor');
    }
  };

  // Start explicit location sharing
  const handleStartTracking = async () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    if (!device) {
      setLocationError('Dispositivo não inicializado.');
      return;
    }

    // Request Wake Lock
    await requestWakeLock();

    // Set backend tracking status to true
    try {
      await api.patch(`/devices/${device.id}/tracking`, { trackingActive: true });
      setIsTracking(true);
    } catch (err) {
      console.error('Erro ao ativar rastreamento no backend:', err);
    }

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentCoords({ lat, lng });
        sendLocationUpdate(lat, lng, device.id);
      },
      (err) => {
        console.error('Erro de geolocalização:', err);
        setLocationError(`Permissão negada ou sinal de GPS indisponível (${err.message}).`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Periodic heartbeat to guarantee updates even if device position stays stationary
    intervalIdRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
          sendLocationUpdate(lat, lng, device.id);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }, 10000);
  };

  // Stop location sharing
  const handleStopTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    await releaseWakeLock();

    if (device) {
      try {
        await api.patch(`/devices/${device.id}/tracking`, { trackingActive: false });
      } catch (err) {
        console.error('Erro ao desativar rastreamento:', err);
      }
    }
    setIsTracking(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      releaseWakeLock();
    };
  }, []);

  // Send SOS Alert
  const handleSendSos = async () => {
    setSendingSos(true);
    try {
      // Try to obtain fresh location if possible
      let lat = currentCoords?.lat;
      let lng = currentCoords?.lng;

      if (!lat && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
        } catch (e) {
          console.warn('Não foi possível obter coordenadas para o SOS:', e);
        }
      }

      await api.post('/alerts', {
        message: selectedMessage,
        deviceId: device?.id || null,
        latitude: lat || null,
        longitude: lng || null,
      });

      setSosSuccessMessage('Alerta de emergência enviado à Central com sucesso!');
      setSosModalOpen(false);

      setTimeout(() => {
        setSosSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao enviar alerta SOS.');
    } finally {
      setSendingSos(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('mobile_token', res.data.token);
      localStorage.setItem('mobile_user', JSON.stringify(res.data.user));
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setCurrentUser(res.data.user);
    } catch (err: any) {
      setAuthError(err.response?.data?.error || 'Credenciais inválidas');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('mobile_token', res.data.token);
      localStorage.setItem('mobile_user', JSON.stringify(res.data.user));
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setCurrentUser(res.data.user);
    } catch (err: any) {
      setAuthError(err.response?.data?.error || 'Erro ao cadastrar usuário');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    handleStopTracking();
    localStorage.removeItem('mobile_token');
    localStorage.removeItem('mobile_user');
    delete api.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  // Auth Screen (Login / Register)
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37,99,235,0.15)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Smartphone size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Web App Mobile</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Compartilhamento voluntário e seguro de localização
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-dark)', padding: '0.25rem', borderRadius: '0.5rem' }}>
            <button
              onClick={() => { setIsRegistering(false); setAuthError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '0.375rem',
                background: !isRegistering ? 'var(--primary)' : 'transparent',
                color: !isRegistering ? '#fff' : 'var(--text-muted)',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Entrar
            </button>
            <button
              onClick={() => { setIsRegistering(true); setAuthError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '0.375rem',
                background: isRegistering ? 'var(--primary)' : 'transparent',
                color: isRegistering ? '#fff' : 'var(--text-muted)',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Criar Conta
            </button>
          </div>

          {authError && <div className="error-alert" style={{ marginBottom: '1rem' }}>{authError}</div>}

          <form onSubmit={isRegistering ? handleRegister : handleLogin}>
            {isRegistering && (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserIcon size={14} /> Nome Completo
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} /> E-mail
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lock size={14} /> Senha
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Mínimo de 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={authLoading} style={{ marginTop: '0.5rem' }}>
              {authLoading ? 'Processando...' : isRegistering ? 'Cadastrar e Acessar' : 'Entrar no Web App'}
            </button>
          </form>

          {onSwitchToCentral && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={onSwitchToCentral}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
              >
                Acessar Central de Rastreamento (Admin)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Logged-in Mobile User View
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile Top Header */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone color="var(--primary)" size={20} />
            Web App Mobile
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Conectado como <strong>{currentUser.name}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {onSwitchToCentral && (
            <button
              onClick={onSwitchToCentral}
              style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--primary)', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
            >
              Central
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '0.375rem', cursor: 'pointer' }}
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ flex: 1, maxWidth: '500px', width: '100%', margin: '0 auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Success / Info Feedback */}
        {sosSuccessMessage && (
          <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid var(--success)', color: '#34d399', padding: '0.875rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <CheckCircle2 size={20} />
            {sosSuccessMessage}
          </div>
        )}

        {locationError && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid var(--danger)', color: '#f87171', padding: '0.875rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertTriangle size={20} />
            {locationError}
          </div>
        )}

        {/* SOS Emergency Callout Button */}
        <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(185,28,28,0.1) 100%)', border: '2px solid rgba(239,68,68,0.5)', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#fca5a5', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            <AlertOctagon size={20} />
            SISTEMA DE EMERGÊNCIA
          </div>
          <button
            onClick={() => setSosModalOpen(true)}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '0.75rem',
              fontSize: '1.15rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
              cursor: 'pointer',
              transition: 'transform 0.1s',
            }}
          >
            <AlertOctagon size={28} />
            ENVIAR ALERTA SOS
          </button>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.75rem' }}>
            Pressione para escolher uma mensagem rápida de socorro para a central.
          </p>
        </div>

        {/* Tracking Status Card */}
        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} color="var(--primary)" />
              Compartilhamento de Localização
            </h3>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                padding: '0.25rem 0.6rem',
                borderRadius: '1rem',
                background: isTracking ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.1)',
                color: isTracking ? '#34d399' : 'var(--text-muted)',
              }}
            >
              {isTracking ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isTracking ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <div style={{ background: 'var(--bg-dark)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Dispositivo:</span>
              <strong>{device?.name || 'Aguardando cadastro...'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Coordenadas atuais:</span>
              <span>
                {currentCoords
                  ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`
                  : 'Nenhuma coordenada coletada'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Último envio à central:</span>
              <span>{lastSentAt ? lastSentAt.toLocaleTimeString('pt-BR') : 'Ainda não enviado'}</span>
            </div>
          </div>

          {/* Action Button: Start or Stop */}
          {!isTracking ? (
            <button
              onClick={handleStartTracking}
              style={{
                width: '100%',
                padding: '0.875rem',
                backgroundColor: 'var(--success)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
              }}
            >
              <Play size={20} />
              Iniciar Compartilhamento
            </button>
          ) : (
            <button
              onClick={handleStopTracking}
              style={{
                width: '100%',
                padding: '0.875rem',
                backgroundColor: 'var(--danger)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
              }}
            >
              <Square size={20} />
              Interromper Compartilhamento
            </button>
          )}

          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.75rem' }}>
            O compartilhamento de localização é voluntário e depende da sua permissão expressa no navegador.
          </p>
        </div>

        {/* Informative Guidance Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>
            💡 Dica para uso contínuo no celular
          </strong>
          Para garantir atualizações contínuas de GPS pelo navegador, mantenha esta aba aberta e ativa na tela. O app aciona automaticamente o bloqueio de suspensão de tela (Wake Lock) enquanto você estiver rastreando.
        </div>
      </main>

      {/* SOS Modal */}
      {sosModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '2px solid var(--danger)', borderRadius: '1rem', width: '100%', maxWidth: '450px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(220, 38, 38, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <AlertOctagon size={24} />
                Enviar Alerta SOS
              </h3>
              <button
                onClick={() => setSosModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Selecione uma mensagem pré-definida de emergência para notificar a central com suas coordenadas atuais:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {PREDEFINED_SOS_MESSAGES.map((msg, index) => {
                const isSelected = selectedMessage === msg;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedMessage(msg)}
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: isSelected ? '2px solid var(--danger)' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-dark)',
                      color: isSelected ? '#fff' : 'var(--text-main)',
                      fontWeight: isSelected ? '600' : 'normal',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    {msg}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSosModalOpen(false)}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendSos}
                disabled={sendingSos}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'var(--danger)',
                  color: '#fff',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <Send size={18} />
                {sendingSos ? 'Enviando...' : 'Confirmar e Enviar SOS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
