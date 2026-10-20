import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Device, Location } from '../types';
import { History, Calendar, Filter } from 'lucide-react';

interface HistoryModalProps {
  device: Device;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ device, onClose }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = `/devices/${device.id}/locations?limit=100`;
      if (startDate) query += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) query += `&endDate=${encodeURIComponent(endDate)}`;

      const response = await api.get(query);
      setLocations(response.data);
    } catch (err) {
      console.error('Erro ao buscar histórico', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [device.id]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        style={{
          width: '90%',
          maxWidth: '800px',
          maxHeight: '85vh',
          overflowY: 'auto',
          margin: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History color="#2563eb" size={24} />
              Histórico de Rastreamento: {device.name}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Usuário: {device.user.name} ({device.user.email})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
        </div>

        {/* Filtros por Período / Data */}
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', backgroundColor: 'var(--bg-dark)', padding: '1rem', borderRadius: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Data Inicial</label>
            <input
              type="datetime-local"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Data Final</label>
            <input
              type="datetime-local"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} />
            Filtrar
          </button>
        </form>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Carregando histórico de localizações...
          </div>
        ) : locations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Nenhuma localização encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Data / Hora da Coleta</th>
                  <th>Recebido pelo Servidor</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={16} color="#94a3b8" />
                      {new Date(loc.collectedAt).toLocaleString('pt-BR')}
                    </td>
                    <td>{new Date(loc.receivedAt).toLocaleString('pt-BR')}</td>
                    <td>{loc.latitude.toFixed(6)}</td>
                    <td>{loc.longitude.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
