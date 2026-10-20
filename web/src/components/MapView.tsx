import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Device } from '../types';

// Ícone customizado para os marcadores no mapa Leaflet
const createCustomIcon = (status: 'active' | 'stale' | 'stopped') => {
  let color = '#ef4444'; // vermelho para stopped
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

interface MapViewProps {
  devices: Device[];
  getDeviceStatus: (device: Device) => 'active' | 'stale' | 'stopped';
}

export const MapView: React.FC<MapViewProps> = ({ devices, getDeviceStatus }) => {
  // Centro padrão (São Paulo) se nenhum dispositivo tiver localização
  const devicesWithLoc = devices.filter((d) => d.lastLocation);
  const defaultCenter: [number, number] = devicesWithLoc.length > 0
    ? [devicesWithLoc[0].lastLocation!.latitude, devicesWithLoc[0].lastLocation!.longitude]
    : [-23.55052, -46.633308];

  return (
    <div className="map-container">
      <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {devicesWithLoc.map((device) => {
          const loc = device.lastLocation!;
          const status = getDeviceStatus(device);
          return (
            <Marker
              key={device.id}
              position={[loc.latitude, loc.longitude]}
              icon={createCustomIcon(status)}
            >
              <Popup>
                <div style={{ color: '#0f172a' }}>
                  <strong>{device.name}</strong> <br />
                  Usuário: {device.user.name} <br />
                  Status: {status === 'active' ? '🟢 Ativo' : status === 'stale' ? '🟡 Sem Atualização Recente' : '🔴 Parado'} <br />
                  Lat: {loc.latitude.toFixed(5)}, Long: {loc.longitude.toFixed(5)} <br />
                  Coletado: {new Date(loc.collectedAt).toLocaleString('pt-BR')}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
