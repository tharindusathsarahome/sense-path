# AI Voice Chat Client

A React Native Expo app for real-time voice conversation with AI using Google Gemini Live API.

## Features

- Real-time audio recording and streaming
- WebSocket connection to server
- Audio playback of AI responses
- Automatic permission handling for microphone and camera
- Connection status indicators
- Automatic reconnection

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on device/simulator:
```bash
# For Android
npm run android

# For iOS
npm run ios

# For web
npm run web
```

## Configuration

The app connects to the server running on:
- Android Emulator: `ws://10.0.2.2:3000`
- iOS Simulator/Physical device: `ws://localhost:3000`

Make sure your server is running on port 3000.

## Permissions

The app requires:
- Microphone permission for audio recording
- Camera permission (for future video features)

## Usage

1. Grant the required permissions when prompted
2. Wait for connection to the server
3. Tap the large green button to start recording
4. Speak your message
5. Tap the red button to stop recording and send to AI
6. Listen to the AI's audio response

## Troubleshooting

- Make sure the server is running on the correct port
- Check network connectivity
- Ensure permissions are granted
- For Android emulator, use `10.0.2.2` instead of `localhost`
