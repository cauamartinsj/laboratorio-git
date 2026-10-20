import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 10.0.2.2 para emulador Android padrão; localhost no Web/Expo SDK; IP local em rede
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001/api';
  }
  return 'http://localhost:3001/api';
};

export const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@tracking:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
