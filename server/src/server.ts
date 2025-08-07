import 'dotenv/config';
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import { join } from 'path';
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
            ws.send(JSON.stringify({ type: 'status', message: 'Processing audio...' }));
            
            // Process audio using the new official service - audio to text only
            const tempFile = join(process.cwd(), 'debug_audio', `temp_${clientId}_${Date.now()}.wav`);
            const audioBuffer = Buffer.from(data.data, 'base64');
            require('fs').writeFileSync(tempFile, audioBuffer);
            // Get text transcription (extract JSON part from string)
            const responseStr = await geminiService.audioToText(tempFile);
            const jsonMatch = responseStr.match(/{[\s\S]*}/);
            if (!jsonMatch) {
              throw new Error('No JSON found in transcription response');
            }
            const transcription: Record<string, any> = JSON.parse(jsonMatch[0]);
            // Clean up temp file
            require('fs').unlinkSync(tempFile);
            
            // Send text response instead of audio to avoid format issues
            ws.send(JSON.stringify({
              type: 'text',
              data: `🎤 You said: "${transcription.user_input}"\n\n🤖 AI Response: ${transcription.model_output}`,
            }));
            
            console.log(`✅ [${clientId}] Audio-to-text processing completed`);
          } catch (audioError) {
            console.error(`❌ [${clientId}] Audio processing failed:`, audioError);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Audio processing failed: ' + (audioError instanceof Error ? audioError.message : 'Unknown error')
            }));
          }
          break;
        case 'text':
          console.log(`💬 [${clientId}] Processing text message: "${data.data}"`);
          try {
            // Send processing status
            ws.send(JSON.stringify({ type: 'status', message: 'Processing text...' }));
            
            // Send text response instead of audio to avoid format issues
            ws.send(JSON.stringify({
              type: 'text',
              data: `💬 You typed: "${data.data}"\n\n🤖 AI Response: I received your message: ${data.data}`,
            }));
            
            console.log(`✅ [${clientId}] Text processing completed`);
          } catch (textError) {
            console.error(`❌ [${clientId}] Text processing failed:`, textError);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Text processing failed: ' + (textError instanceof Error ? textError.message : 'Unknown error')
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
