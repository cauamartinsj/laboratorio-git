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
