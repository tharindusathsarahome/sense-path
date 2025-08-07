# SensePath Server with Integrated SAMSM

A real-time audio streaming server that connects to Google's Gemini API with integrated Scene Analysis and Mode Selector Module (SAMSM) for intelligent tool calling.

## Features

### Core Capabilities
- **Audio Processing**: Real-time audio-to-text conversion
- **Intelligent Tool Calling**: Automatic selection of appropriate tools based on user requests
- **App Mode Detection**: Returns suggested UI modes for the client app
- **Text-to-Speech**: Convert responses back to audio
- **WebSocket Communication**: Real-time bidirectional communication

### SAMSM Tools
1. **Navigation**: Get directions and route planning
2. **Recognition**: Environment and object analysis  
3. **Weather**: Weather and lighting conditions
4. **Automatic Mode Selection**: Sets appropriate app modes

### App Modes
- `navigation`: Active turn-by-turn directions
- `exploration`: Environment description mode
- `social`: Face/person recognition mode
- `weather_check`: Weather and lighting assessment
- `idle`: Default/standby state

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Add your Gemini API key to `.env`:
```
GEMINI_API_KEY=your_actual_api_key_here
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Testing

```bash
node test-integration.js
```

## API

The server runs a WebSocket server that accepts the following message types:

### Input Messages
- `audio`: Send audio data to Gemini (base64 encoded)
- `text`: Send text message for SAMSM processing

### Output Messages
- `audio`: Audio response from Gemini (base64 encoded WAV)
- `text`: Text response with SAMSM processing
- `connected`: Connection established
- `error`: Error message

### Enhanced Response Format
```json
{
  "type": "audio",
  "data": "base64_audio_response",
  "metadata": {
    "transcription": "user input text",
    "response": "ai response text", 
    "mode": "navigation",
    "timestamp": "2025-08-07T..."
  }
}
```

## Example Tool Interactions

- **"I need to get to the train station"** → Navigation tool → `navigation` mode
- **"What's the weather in London?"** → Weather tool → `weather_check` mode  
- **"Describe what's in front of me"** → Recognition tool → `exploration` mode

## File Structure

```
src/
├── server.ts                    # Main WebSocket server
├── gemini-official-service.ts   # Gemini service with integrated SAMSM
├── types.ts                     # TypeScript interfaces
├── modules/
│   ├── navigation.ts           # Navigation tool
│   ├── recognition.ts          # Recognition tool
│   └── weather.ts              # Weather tool
└── gemini-transcribe-prompt.ts # Legacy transcription prompt
```

The SAMSM functionality is now fully integrated into the main Gemini service, providing seamless tool calling and mode detection for enhanced user experiences.
