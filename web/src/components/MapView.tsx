import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Device, Alert } from '../types';

// Ícone para marcadores padrão de dispositivos
const createCustomIcon = (status: 'active' | 'stale' | 'stopped') => {
  let color = '#ef4444'; // vermelho
  if (status === 'active') color = '#10b981'; // verde
  if (status === 'stale') color = '#f59e0b'; // amarelo

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;

  return L.icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Ícone especial pulsante para alertas de emergência
const createAlertIcon = () => {
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#dc2626" width="36" height="36"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10h2v4h-2zm0 6h2v2h-2z"/></svg>`;

  return L.icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString),
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Componente para ajustar o centro e zoom do mapa dinamicamente
const MapCenterUpdater: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
};

interface MapViewProps {
  devices: Device[];
  selectedDeviceIds?: string[];
  filterMode?: 'all' | 'selected';
  activeAlerts?: Alert[];
  focusedLocation?: [number, number] | null;
  historyRoute?: [number, number][];
  getDeviceStatus: (device: Device) => 'active' | 'stale' | 'stopped';
}

export const MapView: React.FC<MapViewProps> = ({
  devices,
  selectedDeviceIds = [],
  filterMode = 'all',
  activeAlerts = [],
  focusedLocation = null,
  historyRoute = [],
  getDeviceStatus,
}) => {
  // Filtra dispositivos conforme modo (todos ou selecionados)
  const displayedDevices = devices.filter((d) => {
    if (!d.lastLocation) return false;
    if (filterMode === 'selected') {
      return selectedDeviceIds.includes(d.id);
    }
    return true;
  });

  // Centro inicial
  let defaultCenter: [number, number] = [-23.55052, -46.633308];
  if (focusedLocation) {
    defaultCenter = focusedLocation;
  } else if (displayedDevices.length > 0 && displayedDevices[0].lastLocation) {
    defaultCenter = [displayedDevices[0].lastLocation.latitude, displayedDevices[0].lastLocation.longitude];
  }

  return (
    <div className="map-container" style={{ position: 'relative', height: '480px', borderRadius: '0.75rem', overflow: 'hidden' }}>
      <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        {focusedLocation && <MapCenterUpdater center={focusedLocation} zoom={15} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcadores de Dispositivos */}
        {displayedDevices.map((device) => {
          const loc = device.lastLocation!;
          const status = getDeviceStatus(device);

          return (
            <Marker
              key={device.id}
              position={[loc.latitude, loc.longitude]}
              icon={createCustomIcon(status)}
            >
              <Popup>
                <div style={{ color: '#0f172a', minWidth: '180px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem' }}>{device.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem' }}>
                    Usuário: <strong>{device.user.name}</strong> ({device.user.email})
                  </div>
                  <div style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    Status: {status === 'active' ? '🟢 Ativo' : status === 'stale' ? '🟡 Sem Atualização (&gt;60s)' : '🔴 Interrompido'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Coords: {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Última coleta: {new Date(loc.collectedAt).toLocaleTimeString('pt-BR')}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Marcadores de Alertas de Emergência (SOS) no mapa */}
        {activeAlerts
          .filter((a) => a.latitude && a.longitude && a.status === 'PENDING')
          .map((alert) => (
            <Marker
              key={`alert-${alert.id}`}
              position={[alert.latitude!, alert.longitude!]}
              icon={createAlertIcon()}
            >
              <Popup>
                <div style={{ color: '#dc2626', minWidth: '180px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ⚠️ ALERTA DE EMERGÊNCIA
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#0f172a', margin: '0.25rem 0', fontWeight: '600' }}>
                    "{alert.message}"
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    Usuário: <strong>{alert.user.name}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Horário: {new Date(alert.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Linha de Trajeto Histórico se houver */}
        {historyRoute.length > 1 && (
          <Polyline
            positions={historyRoute}
            pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.8, dashArray: '6, 6' }}
          />
        )}
      </MapContainer>
    </div>
  );
};
