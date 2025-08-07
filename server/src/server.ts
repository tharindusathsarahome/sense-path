import 'dotenv/config';
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import { GeminiOfficialAudioService } from './gemini-official-service';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

interface ClientConnection {
  ws: WebSocket;
  geminiService: GeminiOfficialAudioService;
}

const connections = new Map<WebSocket, ClientConnection>();

// WebSocket connection handler
wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(`🔗 New client connected: ${clientId}`);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not configured');
    ws.send(JSON.stringify({ type: 'error', message: 'GEMINI_API_KEY not configured' }));
    ws.close();
    return;
  }

  console.log(`🔑 API Key loaded: ${apiKey.substring(0, 10)}...`);
  const geminiService = new GeminiOfficialAudioService(apiKey);

  const connection: ClientConnection = {
    ws,
    geminiService
  };
  
  connections.set(ws, connection);

  // Send connected message immediately
  console.log(`✅ [${clientId}] Gemini service initialized`);
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Gemini Official Service' }));

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      console.log(`📥 [${clientId}] Received message: ${message.toString().substring(0, 200)}...`);
      const data = JSON.parse(message.toString());
      console.log(`🔍 [${clientId}] Parsed message type: ${data.type}`);
      
      switch (data.type) {
        case 'audio':
          console.log(`🎤 [${clientId}] Processing audio message (${data.data?.length || 0} chars)`);
          console.log(`🎵 [${clientId}] Audio MIME type: ${data.mimeType || 'not specified'}`);
          try {
            // Send processing status
            ws.send(JSON.stringify({ type: 'status', message: 'Processing audio with SAMSM...' }));
            
            // Process audio using the new SAMSM-integrated service
            const result = await geminiService.processBase64AudioWithSAMSM(data.data, clientId);
            
            // Send comprehensive response to client
            ws.send(JSON.stringify({
              type: 'audio',
              data: result.audioBuffer.toString('base64'),
              metadata: {
                transcription: result.transcription,
                response: result.response,
                mode: result.mode,
                timestamp: new Date().toISOString()
              }
            }));
            
            console.log(`✅ [${clientId}] SAMSM audio response sent (${result.audioBuffer.length} bytes)`);
            console.log(`📱 [${clientId}] App mode set to: ${result.mode.toUpperCase()}`);
            
          } catch (audioError) {
            console.error(`❌ [${clientId}] SAMSM audio processing failed:`, audioError);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'SAMSM audio processing failed: ' + (audioError instanceof Error ? audioError.message : 'Unknown error')
            }));
          }
          break;
        case 'text':
          console.log(`💬 [${clientId}] Processing text message: "${data.data}"`);
          try {
            // Send processing status
            ws.send(JSON.stringify({ type: 'status', message: 'Processing text with integrated SAMSM...' }));
            
            // Process text directly with the tool calling method
            const result = await geminiService.processTextWithTools(data.data);
            
            // Send comprehensive text response
            ws.send(JSON.stringify({
              type: 'text',
              data: `💬 You typed: "${result.transcription}"\n\n🤖 AI Response: ${result.response}`,
              metadata: {
                transcription: result.transcription,
                response: result.response,
                mode: result.mode,
                timestamp: new Date().toISOString()
              }
            }));
            
            console.log(`✅ [${clientId}] Integrated SAMSM text processing completed`);
            console.log(`📱 [${clientId}] App mode set to: ${result.mode.toUpperCase()}`);
          } catch (textError) {
            console.error(`❌ [${clientId}] Integrated SAMSM text processing failed:`, textError);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Integrated SAMSM text processing failed: ' + (textError instanceof Error ? textError.message : 'Unknown error')
            }));
          }
          break;
        default:
          console.log(`⚠️  [${clientId}] Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error(`❌ [${clientId}] Error processing message:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error processing message: ' + errorMessage
      }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`🔌 [${clientId}] Client disconnected`);
    const connection = connections.get(ws);
    if (connection) {
      // New service doesn't need explicit close
      connections.delete(ws);
      console.log(`🧹 [${clientId}] Connection cleaned up`);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ [${clientId}] WebSocket error:`, error);
    const connection = connections.get(ws);
    if (connection) {
      // New service doesn't need explicit close
      connections.delete(ws);
      console.log(`🧹 [${clientId}] Connection cleaned up after error`);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY environment variable not set!');
    console.log('Please set your Gemini API key: export GEMINI_API_KEY=your_api_key_here');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;
