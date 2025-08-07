import { GoogleGenAI } from '@google/genai';
import { GEMINI_TRANSCRIBE_PROMPT } from './gemini-transcribe-prompt';
import * as fs from 'node:fs';
import * as wav from 'wav';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export class GeminiOfficialAudioService {
  private ai: GoogleGenAI;
  private debugDir: string;
  private messageCounter: number = 0;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({
      apiKey,
    });

    // Create debug directory
    this.debugDir = join(process.cwd(), 'debug_audio');
    if (!existsSync(this.debugDir)) {
      mkdirSync(this.debugDir, { recursive: true });
    }
    console.log(`🔧 Debug directory: ${this.debugDir}`);
  }

  /**
   * Create proper WAV header for PCM audio data
   */
  private createWavHeaderForPcm(dataLength: number, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);

    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);

    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);

    return header;
  }
  private async saveWaveFile(
    filename: string,
    pcmData: Buffer,
    channels = 1,
    rate = 24000,
    sampleWidth = 2,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const writer = new wav.FileWriter(filename, {
        channels,
        sampleRate: rate,
        bitDepth: sampleWidth * 8,
      });

      writer.on('finish', resolve);
      writer.on('error', reject);

      writer.write(pcmData);
      writer.end();
    });
  }

  /**
   * Step 1: Audio Understanding - Convert audio to text
   */
  async audioToText(audioFilePath: string): Promise<string> {
    try {
      console.log(`🎯 Processing audio file: ${audioFilePath}`);

      // Read audio file as base64
      const base64AudioFile = fs.readFileSync(audioFilePath, {
        encoding: 'base64',
      });

      console.log(`📊 Audio file size: ${base64AudioFile.length} characters (base64)`);
      const contents = [
        {
          role: "system",
          text: GEMINI_TRANSCRIBE_PROMPT,
        },
        {
          inlineData: {
            mimeType: "audio/wav",
            data: base64AudioFile,
          },
        },
      ];

      console.log('🔄 Calling Gemini for audio understanding...');
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      const textResult = response.text || '';
      console.log(`💬 Transcribed text: "${textResult}"`);

      // Save transcription for debugging
      const transcriptionFile = join(
        this.debugDir,
        `transcription_${Date.now()}.txt`
      );
      fs.writeFileSync(transcriptionFile, textResult);
      console.log(`💾 Saved transcription: ${transcriptionFile}`);

      return textResult;

    } catch (error) {
      console.error('❌ Error in audio to text:', error);
      throw error;
    }
  }

  /**
   * Step 2: Text to Speech - Convert text to audio
   */
  async textToSpeech(text: string): Promise<Buffer> {
    try {
      console.log(`🗣️ Generating speech for: "${text}"`);

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;

      if (!data) {
        throw new Error('No audio data received from Gemini TTS');
      }

      console.log(`🎵 Received audio data: ${data.length} characters (base64)`);
      console.log(`🎵 Audio MIME type: ${mimeType || 'unknown'}`);

      const audioBuffer = Buffer.from(data, 'base64');
      console.log(`🎵 Raw audio buffer: ${audioBuffer.length} bytes`);

      // Check if the data is already in a playable format
      const first4Bytes = audioBuffer.subarray(0, 4).toString('ascii');
      console.log(`🔍 First 4 bytes: "${first4Bytes}"`);

      // If it's already a WAV file, return as-is
      if (first4Bytes === 'RIFF') {
        console.log('✅ Audio is already in WAV format');
        const outputFile = join(this.debugDir, `generated_speech_${Date.now()}.wav`);
        fs.writeFileSync(outputFile, audioBuffer);
        console.log(`💾 Saved generated speech: ${outputFile}`);
        return audioBuffer;
      }

      // If it's raw PCM data, add WAV header
      console.log('🔄 Converting PCM to WAV format...');
      const wavHeader = this.createWavHeaderForPcm(audioBuffer.length, 24000, 1, 16);
      const wavFile = Buffer.concat([wavHeader, audioBuffer]);

      console.log(`🎵 Generated WAV file: ${wavFile.length} bytes (${audioBuffer.length} data + ${wavHeader.length} header)`);

      // Save the generated audio
      const outputFile = join(this.debugDir, `generated_speech_${Date.now()}.wav`);
      fs.writeFileSync(outputFile, wavFile);
      console.log(`💾 Saved generated speech: ${outputFile}`);

      return wavFile;

    } catch (error) {
      console.error('❌ Error in text to speech:', error);
      throw error;
    }
  }

  /**
   * Complete flow: Audio input -> Text -> Audio response
   */
  async processAudio(audioFilePath: string): Promise<Buffer> {
    try {
      this.messageCounter++;
      console.log(`🎯 Starting audio processing flow #${this.messageCounter}`);

      // Step 1: Convert audio to text
      console.log('📝 Step 1: Audio to Text');
      const transcribedText = await this.audioToText(audioFilePath);

      // Step 2: Generate audio response with fallback
      console.log('🎤 Step 2: Text to Speech');
      try {
        const audioResponse = await this.textToSpeech(transcribedText);
        console.log(`✅ Audio processing flow #${this.messageCounter} completed`);
        return audioResponse;
      } catch (ttsError) {
        console.error('❌ TTS failed, using text fallback:', ttsError);
        // Return a simple text response instead of audio
        const textResponse = `AI Response: ${transcribedText}`;
        const fallbackAudio = await this.generateSimpleAudioFallback(textResponse);
        return fallbackAudio;
      }

    } catch (error) {
      console.error('❌ Error in audio processing flow:', error);
      throw error;
    }
  }

  /**
   * Generate a simple audio fallback (silent audio with text as metadata)
   */
  private async generateSimpleAudioFallback(text: string): Promise<Buffer> {
    console.log('🔄 Generating simple audio fallback...');

    // Generate 1 second of silence as WAV
    const sampleRate = 16000;
    const duration = 1; // 1 second
    const numSamples = sampleRate * duration;
    const audioData = Buffer.alloc(numSamples * 2); // 16-bit samples, so 2 bytes each

    // Fill with silence (zeros)
    audioData.fill(0);

    // Create WAV header
    const wavHeader = this.createWavHeaderForPcm(audioData.length, sampleRate, 1, 16);
    const wavFile = Buffer.concat([wavHeader, audioData]);

    console.log(`🔇 Generated ${duration}s silence: ${wavFile.length} bytes`);

    // Save fallback info
    const fallbackFile = join(this.debugDir, `fallback_${Date.now()}.txt`);
    fs.writeFileSync(fallbackFile, `Fallback text: ${text}`);

    return wavFile;
  }

  /**
   * Process base64 audio (for WebSocket integration)
   */
  async processBase64Audio(base64Audio: string, clientId: string): Promise<Buffer> {
    try {
      // Save the incoming audio to a temporary file
      const tempFile = join(this.debugDir, `temp_${clientId}_${Date.now()}.wav`);
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      fs.writeFileSync(tempFile, audioBuffer);

      console.log(`💾 Saved temporary audio file: ${tempFile}`);

      // Process using the complete flow
      const result = await this.processAudio(tempFile);

      // Clean up temporary file
      fs.unlinkSync(tempFile);
      console.log(`🗑️ Cleaned up temporary file: ${tempFile}`);

      return result;

    } catch (error) {
      console.error('❌ Error processing base64 audio:', error);
      throw error;
    }
  }
}
