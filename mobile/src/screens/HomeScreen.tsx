import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { api } from '../services/api';

interface HomeScreenProps {
  user: any;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ user, onLogout }) => {
  const [device, setDevice] = useState<any>(null);
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Pronto para iniciar');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingDevice, setLoadingDevice] = useState(true);

  const timerRef = useRef<any>(null);

  const initDevice = async () => {
    try {
      setLoadingDevice(true);
      const res = await api.get('/devices');
      const userDevices = res.data;

      if (userDevices.length > 0) {
        setDevice(userDevices[0]);
        setTracking(userDevices[0].trackingActive);
      } else {
        const createRes = await api.post('/devices', {
          name: `Smartphone de ${user.name}`,
          model: Platform.OS === 'android' ? 'Android Device' : 'Mobile Device',
        });
        setDevice(createRes.data);
      }
    } catch (err: any) {
      setErrorMessage('Erro ao comunicar com a central backend.');
    } finally {
      setLoadingDevice(false);
    }
  };

  useEffect(() => {
    initDevice();
  }, []);

  const captureAndSendLocation = async (deviceId: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Permissão de localização negada pelo usuário.');
        setStatusMessage('Permissão negada');
        return;
      }

      const providerStatus = await Location.getProviderStatusAsync();
      if (!providerStatus.locationServicesEnabled) {
        setErrorMessage('GPS desativado no aparelho. Ative o GPS para continuar.');
        setStatusMessage('GPS desativado');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = loc.coords;
      setCurrentLocation({ latitude, longitude });
      setErrorMessage('');

      await api.post(`/devices/${deviceId}/locations`, {
        latitude,
        longitude,
        collectedAt: new Date().toISOString(),
      });

      const timeStr = new Date().toLocaleTimeString('pt-BR');
      setLastSentTime(timeStr);
      setStatusMessage(`Enviado com sucesso às ${timeStr}`);
    } catch (err: any) {
      setErrorMessage('Servidor indisponível ou falha de rede ao enviar coordenadas.');
      setStatusMessage('Erro no envio');
    }
  };

  const startTracking = async () => {
    if (!device) return;

    try {
      await api.patch(`/devices/${device.id}/tracking`, { trackingActive: true });
      setTracking(true);
      setStatusMessage('Rastreamento ativo (envio a cada 10s)');
      setErrorMessage('');

      await captureAndSendLocation(device.id);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        captureAndSendLocation(device.id);
      }, 10000);
    } catch (err) {
      setErrorMessage('Falha ao iniciar rastreamento no servidor.');
    }
  };

  const stopTracking = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTracking(false);
    setStatusMessage('Rastreamento interrompido pelo usuário');

    if (device) {
      try {
        await api.patch(`/devices/${device.id}/tracking`, { trackingActive: false });
      } catch (err) {
        // ignora
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (loadingDevice) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ color: '#94a3b8', marginTop: 12 }}>Carregando dados do dispositivo...</Text>
      </View>
    );
  }

  const mapRegion = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: -23.55052,
        longitude: -46.633308,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.userName}>Olá, {user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Card do Dispositivo */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identificação do Dispositivo</Text>
        <Text style={styles.deviceInfo}>Nome: {device?.name || 'Não identificado'}</Text>
        <Text style={styles.deviceInfo}>ID: {device?.id}</Text>
      </View>

      {/* Card de Status do Rastreamento */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status do Rastreamento</Text>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: tracking ? '#10b981' : '#ef4444' },
            ]}
          />
          <Text style={styles.statusState}>
            {tracking ? 'RASTREAMENTO ATIVO' : 'RASTREAMENTO INTERROMPIDO'}
          </Text>
        </View>

        <Text style={styles.statusDetail}>Status: {statusMessage}</Text>
        {lastSentTime ? (
          <Text style={styles.statusDetail}>Último Envio: {lastSentTime}</Text>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

      {/* Mapa com Localização Atual (Requisito 2 e 8) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mapa de Localização GPS</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            showsUserLocation={true}
            followsUserLocation={true}
          >
            {currentLocation && (
              <Marker
                coordinate={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                title={device?.name || 'Meu Dispositivo'}
                description={`Última atualização: ${lastSentTime || 'Agora'}`}
              />
            )}
          </MapView>
        </View>
      </View>

      {/* Painel de Coordenadas Atuais */}
      {currentLocation ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coordenadas Atuais (GPS)</Text>
          <View style={styles.coordsContainer}>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <Text style={styles.coordValue}>{currentLocation.latitude.toFixed(6)}</Text>
            </View>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <Text style={styles.coordValue}>{currentLocation.longitude.toFixed(6)}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Botões de Controle Manual */}
      <View style={styles.actionsContainer}>
        {!tracking ? (
          <TouchableOpacity style={styles.startButton} onPress={startTracking}>
            <Text style={styles.actionButtonText}>INICIAR RASTREAMENTO</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
            <Text style={styles.actionButtonText}>INTERROMPER RASTREAMENTO</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8',
  },
  logoutButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  deviceInfo: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusState: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusDetail: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 4,
  },
  errorText: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    color: '#ef4444',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    fontSize: 13,
  },
  mapContainer: {
    height: 220,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  coordsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  coordBox: {
    backgroundColor: '#0f172a',
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  coordLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  coordValue: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 4,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
