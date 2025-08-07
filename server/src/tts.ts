// src/tts.ts
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { writeFile } from 'fs';
import { promisify } from 'util';

// Promisify writeFile to use with async/await
const writeFileAsync = promisify(writeFile);

// --- All helper functions for WAV conversion are included here ---
interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function createWavHeader(dataLength: number, options: WavConversionOptions): Buffer {
  const { numChannels, sampleRate, bitsPerSample } = options;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function parseMimeType(mimeType: string): WavConversionOptions {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options: Partial<WavConversionOptions> = {
    numChannels: 1,
    bitsPerSample: 16,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) options.bitsPerSample = bits;
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate' && !isNaN(parseInt(value, 10))) {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options as WavConversionOptions;
}

function convertToWav(rawData: string[], mimeType: string): Buffer {
  const options = parseMimeType(mimeType);
  const dataLength = rawData.reduce((acc, chunk) => acc + Buffer.from(chunk, 'base64').length, 0);
  const wavHeader = createWavHeader(dataLength, options);
  const buffer = Buffer.concat(rawData.map(data => Buffer.from(data, 'base64')));
  return Buffer.concat([wavHeader, buffer]);
}

export async function speakText(textToSpeak: string, fileName: string = 'audio.wav', apiKey: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const ai = new GoogleGenAI({ apiKey });
    const model = 'models/gemini-2.0-flash-live-001';
    const responseQueue: LiveServerMessage[] = [];
    const audioParts: string[] = [];
    let audioMimeType: string | undefined;
    let session: Session;

    const config = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        // *** CHANGE THIS TO SINHALA ***
        languageCode: 'si-LK', 
        voiceConfig: {
          // Note: prebuiltVoiceConfig might be ignored if a specific voice for si-LK is chosen by the model.
          prebuiltVoiceConfig: { voiceName: 'Puck' }, 
        },
      },
    };

    try {
      session = await ai.live.connect({
        model,
        config,
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              const part = message.serverContent.modelTurn.parts[0];
              if (part?.inlineData) {
                if (!audioMimeType) audioMimeType = part.inlineData.mimeType;
                audioParts.push(part.inlineData.data ?? '');
              }
            }
            if (message.serverContent?.turnComplete) {
              responseQueue.push(message);
            }
          },
          onerror: (e: ErrorEvent) => reject(new Error(`Session Error: ${e.message}`)),
          onclose: () => {},
        },
      });

      session.sendClientContent({ turns: [{ text: textToSpeak }] });

      const waitMessage = async () => {
        while (true) {
          if (responseQueue.length > 0) return responseQueue.shift();
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      };

      await waitMessage();
      session.close();

      if (audioParts.length > 0 && audioMimeType) {
        const buffer = convertToWav(audioParts, audioMimeType);
        await writeFileAsync(fileName, buffer, 'binary');
        console.log(`[TTS Module]: Successfully saved Sinhala audio to ${fileName}`);
        resolve();
      } else {
        reject(new Error("No audio data was received from the API."));
      }
    } catch (error) {
      reject(error);
    }
  });
}
