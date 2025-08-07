# Gemini Live API Audio Streaming App

A real-time audio streaming application with React Native Expo client and Node.js server using Google's Gemini Live API.

## Project Structure

```
├── server/          # Node.js TypeScript server
│   ├── src/         # Source files
│   │   ├── server.ts        # Main WebSocket server
│   │   └── gemini-service.ts # Gemini Live API integration
│   ├── dist/        # Compiled JavaScript files
│   ├── debug_audio/ # Audio debugging files (auto-created)
│   └── package.json # Server dependencies
└── client/          # React Native Expo app
    ├── App.tsx      # Main client application
    └── package.json # Client dependencies
```

## Features

- **Real-time audio streaming** between client and AI
- **WebSocket communication** for low-latency data transfer
- **Cross-platform client** (iOS, Android, Web)
- **Audio debugging** with file saving for troubleshooting
- **Permission handling** for microphone access
- **Connection management** with timeout protection
- **Audio playback** of AI responses

## Quick Start

### 1. Server Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm run build
npm start
```

### 2. Client Setup

```bash
cd client
npm install
npm start
```

### 3. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to `server/.env` file:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

## Architecture

### Server (Node.js + TypeScript)
- **WebSocket server** for real-time communication
- **Gemini Live API integration** for conversational AI
- **Audio format conversion** from PCM to WAV
- **Message queue management** for streaming responses

### Client (React Native Expo)
- **Audio recording** using expo-av
- **WebSocket client** for server communication
- **Permission management** for microphone/camera
- **Audio playback** of AI responses
- **Connection status monitoring**

## Usage

1. **Start the server** with your Gemini API key
2. **Launch the client app** on your device/simulator
3. **Grant permissions** for microphone and camera
4. **Tap the big button** to start/stop recording
5. **Speak your message** and wait for AI response
6. **Listen to the AI's audio response**

## Configuration

### Server Configuration
- Port: 3000 (configurable via `PORT` env var)
- Gemini model: `gemini-2.5-flash-preview-native-audio-dialog`
- Audio settings: 16kHz, mono, 16-bit

### Client Configuration
- Server URL: Automatically detects localhost/emulator
- Audio format: WAV, 16kHz, mono
- Auto-reconnection: 3-second intervals

## Development

### Server Development
```bash
cd server
npm run dev      # Development with auto-reload
npm run build    # Build for production
npm start        # Run production build
```

### Client Development
```bash
cd client
npm start        # Start Expo dev server
npm run android  # Run on Android
npm run ios      # Run on iOS
npm run web      # Run on web
```

## Troubleshooting

### Common Issues

1. **"Cannot connect to server"**
   - Ensure server is running on port 3000
   - Check if GEMINI_API_KEY is set correctly
   - For Android emulator, server uses `10.0.2.2:3000`

2. **"Permissions denied"**
   - Grant microphone and camera permissions
   - Restart the app after granting permissions

3. **"No audio playback"**
   - Check device volume settings
   - Ensure device supports audio playback
   - Check network connection

4. **Build errors**
   - Run `npm install` in both directories
   - Clear npm cache: `npm cache clean --force`
   - For Expo: `npx expo install --fix`

### Network Configuration

- **Development**: Uses localhost/10.0.2.2
- **Production**: Update `CONFIG.SERVER_URL` in client
- **Firewall**: Ensure port 3000 is open

## Dependencies

### Server Dependencies
- `@google/genai`: Gemini API client
- `ws`: WebSocket server
- `express`: HTTP server
- `cors`: Cross-origin resource sharing

### Client Dependencies
- `expo-av`: Audio recording and playback
- `expo-camera`: Camera permissions
- `expo-file-system`: File operations
- `react-native`: Core framework

## License

MIT License
