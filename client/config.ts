import { Platform } from 'react-native';

export const CONFIG = {
  // Server configuration
  SERVER_URL: __DEV__ 
    ? (Platform.OS === 'android' ? 'ws://10.0.2.2:3000' : 'ws://localhost:3000')
    : 'wss://your-production-server.com',
    
  // Audio recording settings
  AUDIO_SETTINGS: {
    SAMPLE_RATE: 16000,
    CHANNELS: 1,
    BIT_RATE: 128000,
  },
  
  // Reconnection settings
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
};
