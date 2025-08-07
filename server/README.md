# Server

A real-time audio streaming server that connects to Google's Gemini Live API for conversational AI.

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

## API

The server runs a WebSocket server that accepts the following message types:

- `audio`: Send audio data to Gemini (base64 encoded)
- `text`: Send text message to Gemini

The server responds with:

- `audio`: Audio response from Gemini (base64 encoded WAV)
- `text`: Text response from Gemini
- `connected`: Connection established
- `error`: Error message
