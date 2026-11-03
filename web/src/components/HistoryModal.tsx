import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Device, Location } from '../types';
import { History, Calendar, Filter } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

interface HistoryModalProps {
  device: Device;
  onClose: () => void;
}

const pointIcon = L.icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" width="16" height="16"><circle cx="12" cy="12" r="8"/></svg>`),
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export const HistoryModal: React.FC<HistoryModalProps> = ({ device, onClose }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = `/devices/${device.id}/locations?limit=200`;
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

  // Prepara as coordenadas ordenadas cronologicamente para a polilinha
  const routePoints: [number, number][] = [...locations]
    .sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime())
    .map((l) => [l.latitude, l.longitude]);

  const center: [number, number] = routePoints.length > 0
    ? routePoints[routePoints.length - 1]
    : device.lastLocation
    ? [device.lastLocation.latitude, device.lastLocation.longitude]
    : [-23.55052, -46.633308];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <History color="#2563eb" size={24} />
              Trajeto e Histórico: {device.name}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Usuário: <strong>{device.user.name}</strong> ({device.user.email})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.75rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Filtros por Período / Data */}
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.25rem', backgroundColor: 'var(--bg-dark)', padding: '1rem', borderRadius: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Data e Hora Inicial</label>
            <input
              type="datetime-local"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Data e Hora Final</label>
            <input
              type="datetime-local"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} />
            Filtrar Trajeto
          </button>
        </form>

        {/* Visualização do Trajeto no Mapa */}
        {routePoints.length > 0 && (
          <div style={{ height: '300px', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
            <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline positions={routePoints} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />
              {routePoints.map((pos, idx) => (
                <Marker key={idx} position={pos} icon={pointIcon}>
                  <Popup>
                    Ponto {idx + 1} de {routePoints.length} <br />
                    Lat: {pos[0].toFixed(5)}, Lng: {pos[1].toFixed(5)}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Carregando histórico e trajeto...
          </div>
        ) : locations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Nenhuma coordenada gravada para este dispositivo no período selecionado.
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Data/Hora Coletada</th>
                  <th>Data/Hora Recebida</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={15} color="#94a3b8" />
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
