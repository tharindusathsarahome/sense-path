export interface WebSocketMessage {
  type: 'audio' | 'text' | 'connected' | 'error' | 'status';
  data?: string;
  message?: string;
  mimeType?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: {
    transcription?: string;
    response?: string;
  };
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}
