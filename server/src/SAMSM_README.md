# SensePath SAMSM Integration

This integration combines the original SensePath Gemini audio processing capabilities with the Scene Analysis and Mode Selector Module (SAMSM) that includes advanced tool calling functionality.

## Features

### Core Functionality
- **Audio-to-Text**: Convert speech to text using Gemini
- **SAMSM Processing**: Intelligent tool calling based on user requests
- **Text-to-Speech**: Convert responses back to audio (English + Sinhala support)
- **Real-time WebSocket**: Live communication with clients

### SAMSM Tools
1. **Navigation**: Get directions to destinations
2. **Recognition**: Analyze surroundings (objects, faces, scenes)  
3. **Weather**: Get weather and lighting conditions
4. **Mode Detection**: Automatically set appropriate app modes

### App Modes
- `navigation`: Active turn-by-turn directions
- `exploration`: Environment description mode
- `social`: Face/person recognition mode
- `weather_check`: Weather and lighting assessment
- `idle`: Default/standby state

## File Structure

```
server/src/
├── server.ts                    # Main WebSocket server with SAMSM integration
├── gemini-official-service.ts   # Enhanced Gemini service with SAMSM
├── samsm.ts                    # Scene Analysis and Mode Selector Module
├── tts.ts                      # Text-to-Speech with Sinhala support
├── types.ts                    # TypeScript interfaces and types
├── samsm-demo.ts              # Standalone demonstration script
├── modules/
│   ├── navigation.ts          # Navigation tool implementation
│   ├── recognition.ts         # Recognition tool implementation
│   └── weather.ts             # Weather tool implementation
└── gemini-transcribe-prompt.ts # Original transcription prompt
```

## Usage

### WebSocket Server
Start the enhanced server:
```bash
npm run dev
```

The server now processes audio/text through SAMSM and returns:
- Audio response (Sinhala when possible, English fallback)
- App mode suggestion
- Transcription and response metadata

### Standalone Demo
Test SAMSM functionality directly:
```bash
npm run demo
```

### Example Interactions

**Navigation Request:**
```
User: "I need to get to the main train station"
SAMSM: Calls start_navigation tool
Mode: navigation
Response: "Route calculation to main train station via walking has started. Estimated time: 12 minutes."
```

**Environment Recognition:**
```
User: "Describe what's in front of me"
SAMSM: Calls describe_surroundings tool
Mode: exploration  
Response: "There appears to be a table and two chairs in front of you."
```

**Weather Inquiry:**
```
User: "What's the weather like in London? Do I need a jacket?"
SAMSM: Calls get_weather_and_light tool
Mode: weather_check
Response: "The weather in London is 18°C and partly cloudy with bright daylight and good visibility."
```

## WebSocket Message Format

### Client -> Server (Audio)
```json
{
  "type": "audio",
  "data": "base64_audio_data",
  "mimeType": "audio/wav"
}
```

### Server -> Client (Enhanced Response)
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

## Integration Benefits

1. **Intelligent Tool Selection**: AI automatically chooses appropriate tools based on context
2. **Mode-Aware Responses**: App can adjust UI based on detected interaction mode
3. **Multi-language Support**: Sinhala TTS with English fallback
4. **Comprehensive Logging**: Full debug information for all processing steps
5. **Extensible Architecture**: Easy to add new tools and modes

## Configuration

Ensure your `.env` file contains:
```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

## Development Notes

- The SAMSM integration maintains backward compatibility
- Audio processing includes both simple transcription and enhanced tool calling
- Debug files are saved to `debug_audio/` directory
- All tool implementations are mock functions for demonstration
- Real implementations would integrate with actual APIs and services

## Error Handling

The system includes graceful fallbacks:
- If Sinhala TTS fails, falls back to English TTS
- If tool calling fails, returns direct text response
- If audio processing fails, provides error messages
- WebSocket reconnection handling

This integration provides a foundation for building sophisticated voice-controlled navigation and assistance applications.
