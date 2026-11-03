export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  collectedAt: string;
  receivedAt: string;
}

export interface Device {
  id: string;
  name: string;
  model?: string;
  trackingActive: boolean;
  lastActiveAt?: string;
  userId: string;
  user: User;
  lastLocation?: Location | null;
}

export interface Alert {
  id: string;
  message: string;
  status: 'PENDING' | 'VIEWED' | 'RESOLVED';
  latitude?: number | null;
  longitude?: number | null;
  userId: string;
  user: User;
  deviceId?: string | null;
  device?: Device | null;
  createdAt: string;
  updatedAt: string;
}
