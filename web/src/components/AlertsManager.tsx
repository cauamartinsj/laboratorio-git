import React from 'react';
import { Alert } from '../types';
import { AlertOctagon, CheckCircle2, Eye, Clock, MapPin, Smartphone, User } from 'lucide-react';
import { api } from '../api';

interface AlertsManagerProps {
  alerts: Alert[];
  onAlertUpdated: () => void;
  onLocateAlert?: (alert: Alert) => void;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({ alerts, onAlertUpdated, onLocateAlert }) => {
  const updateAlertStatus = async (id: string, status: 'VIEWED' | 'RESOLVED') => {
    try {
      await api.patch(`/alerts/${id}/status`, { status });
      onAlertUpdated();
    } catch (err) {
      console.error('Erro ao atualizar alerta:', err);
    }
  };

  const pendingAlerts = alerts.filter((a) => a.status === 'PENDING');
  const viewedAlerts = alerts.filter((a) => a.status === 'VIEWED');
  const resolvedAlerts = alerts.filter((a) => a.status === 'RESOLVED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alertas Ativos / Pendentes */}
      <div className="card" style={{ border: pendingAlerts.length > 0 ? '2px solid var(--danger)' : '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: pendingAlerts.length > 0 ? '#f87171' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon size={22} color={pendingAlerts.length > 0 ? '#ef4444' : '#94a3b8'} />
            Alertas Críticos Pendentes ({pendingAlerts.length})
          </h3>
        </div>

        {pendingAlerts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem' }}>
            Nenhum alerta de emergência pendente no momento. Central em operação normal.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingAlerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', textTransform: 'uppercase' }}>
                      PENDENTE
                    </span>
                    <h4 style={{ fontSize: '1.1rem', marginTop: '0.4rem', color: '#fff', fontWeight: 'bold' }}>
                      "{alert.message}"
                    </h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <Clock size={14} />
                    {new Date(alert.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={15} color="var(--primary)" />
                    <strong>{alert.user.name}</strong> ({alert.user.email})
                  </div>
                  {alert.device && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Smartphone size={15} color="var(--primary)" />
                      {alert.device.name}
                    </div>
                  )}
                  {alert.latitude && alert.longitude && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={15} color="#ef4444" />
                      {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {alert.latitude && alert.longitude && onLocateAlert && (
                    <button
                      onClick={() => onLocateAlert(alert)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <MapPin size={14} />
                      Ver no Mapa
                    </button>
                  )}
                  <button
                    onClick={() => updateAlertStatus(alert.id, 'VIEWED')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Eye size={14} />
                    Marcar como Visualizado
                  </button>
                  <button
                    onClick={() => updateAlertStatus(alert.id, 'RESOLVED')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: 'var(--success)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Marcar como Resolvido
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico Geral de Alertas (Visualizados e Resolvidos) */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>
          Histórico de Alertas ({viewedAlerts.length + resolvedAlerts.length})
        </h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Mensagem</th>
                <th>Usuário</th>
                <th>Dispositivo</th>
                <th>Localização</th>
                <th>Data/Hora</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {[...viewedAlerts, ...resolvedAlerts].length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum alerta anterior registrado.
                  </td>
                </tr>
              ) : (
                [...viewedAlerts, ...resolvedAlerts].map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      {alert.status === 'VIEWED' && (
                        <span className="badge badge-stale">Visualizado</span>
                      )}
                      {alert.status === 'RESOLVED' && (
                        <span className="badge badge-active">Resolvido</span>
                      )}
                    </td>
                    <td><strong>{alert.message}</strong></td>
                    <td>{alert.user.name}</td>
                    <td>{alert.device?.name || 'N/A'}</td>
                    <td>
                      {alert.latitude && alert.longitude
                        ? `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`
                        : 'Sem GPS'}
                    </td>
                    <td>{new Date(alert.createdAt).toLocaleString('pt-BR')}</td>
                    <td>
                      {alert.status === 'VIEWED' && (
                        <button
                          onClick={() => updateAlertStatus(alert.id, 'RESOLVED')}
                          style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            background: 'var(--success)',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
