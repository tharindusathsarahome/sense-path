import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { GEMINI_TRANSCRIBE_PROMPT } from './gemini-transcribe-prompt';
import * as fs from 'node:fs';
import * as wav from 'wav';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppMode } from './types';

// Import our mock sub-module functions AND their argument types
import { startNavigation, NavigationArgs } from './modules/navigation';
import { describeSurroundings, RecognitionArgs } from './modules/recognition';
import { getWeatherAndLight, WeatherArgs } from './modules/weather';

export class GeminiOfficialAudioService {
  // Model definitions
  static readonly MODEL_TRANSCRIBE = "gemini-2.5-flash";
  static readonly MODEL_TOOL_CALLING = "gemini-2.5-flash";
  static readonly MODEL_TTS = "gemini-2.5-flash-preview-tts";
  static readonly VOICE_NAME = "Rasalgethi";

  // | Correct Name  | Voice Style |
  // | ------------- | ----------- |
  // | Rasalgethi    | Informative |
  // | Enceladus     | Breathy     |
  // | Kore          | Firm        |
  // | Callirrhoe    | Easy-going  |
  // | Sulafat       | Warm        |
  // | Charon        | Informative |
  // | Algenib       | Gravelly    |
  // | Zubenelgenubi | Casual      |
  // | Umbriel       | Easy-going  |
  // | Sadachbia     | Lively      |
  // | Leda          | Youthful    |

  private ai: GoogleGenAI;
  private debugDir: string;
  private messageCounter: number = 0;
  private apiKey: string;
  private functionDeclarations: FunctionDeclaration[];
  private toolFunctions: Record<string, Function>;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({
      apiKey,
    });

    // Create debug directory
    this.debugDir = join(process.cwd(), 'debug_audio');
    if (!existsSync(this.debugDir)) {
      mkdirSync(this.debugDir, { recursive: true });
    }
    console.log(`🔧 Debug directory: ${this.debugDir}`);

    // Initialize tool functions
    this.toolFunctions = {
      start_navigation: startNavigation,
      describe_surroundings: describeSurroundings,
      get_weather_and_light: getWeatherAndLight,
    };

    // Initialize function declarations for tool calling
    this.functionDeclarations = [
      {
        name: 'start_navigation',
        description: 'Initiates turn-by-turn navigation to a specified destination.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            destination: {
              type: Type.STRING,
              description: 'The final destination, e.g., "123 Main St, Anytown" or "local library".',
            },
            travel_mode: {
              type: Type.STRING,
              enum: ['walking', 'transit'],
              description: 'The method of travel.'
            },
            suggested_mode: {
              type: Type.STRING,
              enum: ['navigation', 'exploration', 'idle'],
              description: 'The most appropriate application mode for this action.'
            }
          },
          required: ['destination', 'travel_mode', 'suggested_mode'],
        },
      },
      {
        name: 'describe_surroundings',
        description: 'Analyzes the current environment from the camera to describe objects, faces, or the general scene.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            analysis_type: {
              type: Type.STRING,
              enum: ['object', 'face', 'scene'],
              description: 'The type of analysis to perform on the visual input.'
            },
            suggested_mode: {
              type: Type.STRING,
              enum: ['exploration', 'social', 'idle'],
              description: 'The most appropriate application mode for this action.'
            }
          },
          required: ['analysis_type', 'suggested_mode'],
        },
      },
      {
        name: 'get_weather_and_light',
        description: 'Fetches the current weather and ambient light conditions for a given location to assess safety and comfort.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            location: {
              type: Type.STRING,
              description: 'The city or area to get weather for, e.g., "San Francisco, CA".',
            },
            suggested_mode: {
              type: Type.STRING,
              enum: ['weather_check', 'idle'],
              description: 'The most appropriate application mode for this action.'
            }
          },
          required: ['location', 'suggested_mode'],
        },
      },
    ];
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
   * Enhanced Audio Understanding with SAMSM Tool Calling
   * Convert audio to text and process with intelligent tool selection
   */
  async audioToTextWithTools(audioFilePath: string): Promise<{ transcription: string; response: string; mode: AppMode }> {
    try {
      console.log(`🎯 Processing audio file with tools: ${audioFilePath}`);

      // Read audio file as base64
      const base64AudioFile = fs.readFileSync(audioFilePath, {
        encoding: 'base64',
      });

      console.log(`📊 Audio file size: ${base64AudioFile.length} characters (base64)`);

      // First, transcribe the audio
      const transcribeContents = [
        {
          role: "system",
          text: "Transcribe the following audio and return only the transcribed text without any additional formatting or JSON.",
        },
        {
          inlineData: {
            mimeType: "audio/wav",
            data: base64AudioFile,
          },
        },
      ];

      console.log('🔄 Calling Gemini for audio transcription...');
      const transcribeResponse = await this.ai.models.generateContent({
        model: GeminiOfficialAudioService.MODEL_TRANSCRIBE,
        contents: transcribeContents,
      });

      const transcription = transcribeResponse.text?.trim() || '';
      console.log(`💬 Transcribed text: "${transcription}"`);

      // Save transcription for debugging
      const transcriptionFile = join(
        this.debugDir,
        `transcription_${Date.now()}.txt`
      );
      fs.writeFileSync(transcriptionFile, transcription);
      console.log(`💾 Saved transcription: ${transcriptionFile}`);

      // Now process with SAMSM tool calling
      console.log('🧠 Processing with SAMSM tool calling...');
      const toolContents: any[] = [{ role: 'user', parts: [{ text: transcription }] }];

      const toolResult = await this.ai.models.generateContent({
        model: GeminiOfficialAudioService.MODEL_TOOL_CALLING,
        contents: toolContents,
        config: { tools: [{ functionDeclarations: this.functionDeclarations }] },
      });

      // Handle tool calling response
      const responseText = toolResult.text ?? "I could not determine a text response.";
      
      if (!toolResult.functionCalls || toolResult.functionCalls.length === 0) {
        console.log("AI decided not to call a function. Returning direct response.");
        return { transcription, response: responseText, mode: 'idle' };
      }

      const functionCall = toolResult.functionCalls[0];
      const { name, args } = functionCall;
      console.log(`\nAI decided to call function: ${name}`);
      console.log(`With arguments: ${JSON.stringify(args)}`);

      const suggested_mode = args ? (args.suggested_mode as AppMode) : 'idle';
      console.log(`AI suggested App Mode: ${suggested_mode.toUpperCase()}`);

      // Execute the chosen function
      let toolResponse: object;
      
      switch (name) {
        case 'start_navigation':
          toolResponse = startNavigation(args as unknown as NavigationArgs);
          break;
        
        case 'describe_surroundings':
          toolResponse = describeSurroundings(args as unknown as RecognitionArgs);
          break;
          
        case 'get_weather_and_light':
          toolResponse = getWeatherAndLight(args as unknown as WeatherArgs);
          break;
          
        default:
          throw new Error(`Error: AI tried to call an unknown function "${name}"`);
      }

      // Get final user-friendly response
      toolContents.push({ role: 'model', parts: [{ functionCall: functionCall }] });
      toolContents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: name,
            response: { result: toolResponse },
          },
        }],
      });

      const finalResult = await this.ai.models.generateContent({
        model: GeminiOfficialAudioService.MODEL_TOOL_CALLING,
        contents: toolContents,
        config: { tools: [{ functionDeclarations: this.functionDeclarations }] },
      });

      const finalResponseText = (finalResult.text ?? 'Action completed.').trim();
      console.log(`\nFinal AI Response: "${finalResponseText}"`);

      return { transcription, response: finalResponseText, mode: suggested_mode };

    } catch (error) {
      console.error('❌ Error in audio to text with tools:', error);
      throw error;
    }
  }

  /**
   * Step 1: Audio Understanding - Convert audio to text (Legacy method)
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
        model: GeminiOfficialAudioService.MODEL_TRANSCRIBE,
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
        model: GeminiOfficialAudioService.MODEL_TTS,
        contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: GeminiOfficialAudioService.VOICE_NAME },
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
   * Process text input with SAMSM tool calling
   */
  async processTextWithTools(textInput: string): Promise<{ transcription: string; response: string; mode: AppMode }> {
    try {
      console.log('🧠 Processing text with SAMSM tool calling...');
      const toolContents: any[] = [{ role: 'user', parts: [{ text: textInput }] }];

      const toolResult = await this.ai.models.generateContent({
        model: GeminiOfficialAudioService.MODEL_TOOL_CALLING,
        contents: toolContents,
        config: { tools: [{ functionDeclarations: this.functionDeclarations }] },
      });

      // Handle tool calling response
      const responseText = toolResult.text ?? "I could not determine a text response.";
      
      if (!toolResult.functionCalls || toolResult.functionCalls.length === 0) {
        console.log("AI decided not to call a function. Returning direct response.");
        return { transcription: textInput, response: responseText, mode: 'idle' };
      }

      const functionCall = toolResult.functionCalls[0];
      const { name, args } = functionCall;
      console.log(`\nAI decided to call function: ${name}`);
      console.log(`With arguments: ${JSON.stringify(args)}`);

      const suggested_mode = args ? (args.suggested_mode as AppMode) : 'idle';
      console.log(`AI suggested App Mode: ${suggested_mode.toUpperCase()}`);

      // Execute the chosen function
      let toolResponse: object;
      
      switch (name) {
        case 'start_navigation':
          toolResponse = startNavigation(args as unknown as NavigationArgs);
          break;
        
        case 'describe_surroundings':
          toolResponse = describeSurroundings(args as unknown as RecognitionArgs);
          break;
          
        case 'get_weather_and_light':
          toolResponse = getWeatherAndLight(args as unknown as WeatherArgs);
          break;
          
        default:
          throw new Error(`Error: AI tried to call an unknown function "${name}"`);
      }

      // Get final user-friendly response
      toolContents.push({ role: 'model', parts: [{ functionCall: functionCall }] });
      toolContents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: name,
            response: { result: toolResponse },
          },
        }],
      });

      const finalResult = await this.ai.models.generateContent({
        model: GeminiOfficialAudioService.MODEL_TOOL_CALLING,
        contents: toolContents,
        config: { tools: [{ functionDeclarations: this.functionDeclarations }] },
      });

      const finalResponseText = (finalResult.text ?? 'Action completed.').trim();
      console.log(`\nFinal AI Response: "${finalResponseText}"`);

      return { transcription: textInput, response: finalResponseText, mode: suggested_mode };

    } catch (error) {
      console.error('❌ Error in text processing with tools:', error);
      throw error;
    }
  }

  /**
   * Enhanced audio processing with integrated SAMSM tool calling
   * Audio input -> Text -> Tool Calling -> Audio response
   */
  async processAudioWithSAMSM(audioFilePath: string): Promise<{ audioBuffer: Buffer; mode: AppMode; transcription: string; response: string }> {
    try {
      this.messageCounter++;
      console.log(`🎯 Starting integrated audio processing flow #${this.messageCounter}`);

      // Step 1: Convert audio to text and process with integrated tool calling
      console.log('📝🧠 Step 1: Audio to Text with SAMSM Tool Calling');
      const { transcription, response: finalResponse, mode } = await this.audioToTextWithTools(audioFilePath);

      console.log(`🧠 SAMSM Response: "${finalResponse}"`);
      console.log(`📱 Suggested App Mode: ${mode.toUpperCase()}`);

      // Step 2: Generate audio response using existing TTS
      console.log('🎤 Step 2: Text to Speech');
      try {
        const audioResponse = await this.textToSpeech(finalResponse);
        console.log(`✅ Integrated audio processing flow #${this.messageCounter} completed`);
        
        return {
          audioBuffer: audioResponse,
          mode,
          transcription,
          response: finalResponse
        };
      } catch (ttsError) {
        console.error('❌ TTS failed, creating silent fallback:', ttsError);
        // Fallback to silent audio
        const fallbackAudio = await this.generateSimpleAudioFallback(finalResponse);
        return {
          audioBuffer: fallbackAudio,
          mode,
          transcription,
          response: finalResponse
        };
      }

    } catch (error) {
      console.error('❌ Error in integrated audio processing flow:', error);
      throw error;
    }
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

  /**
   * Process base64 audio with SAMSM integration (for WebSocket integration)
   */
  async processBase64AudioWithSAMSM(base64Audio: string, clientId: string): Promise<{ audioBuffer: Buffer; mode: AppMode; transcription: string; response: string }> {
    try {
      // Save the incoming audio to a temporary file
      const tempFile = join(this.debugDir, `temp_samsm_${clientId}_${Date.now()}.wav`);
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      fs.writeFileSync(tempFile, audioBuffer);

      console.log(`💾 Saved temporary audio file for SAMSM: ${tempFile}`);

      // Process using the enhanced SAMSM flow
      const result = await this.processAudioWithSAMSM(tempFile);

      // Clean up temporary file
      fs.unlinkSync(tempFile);
      console.log(`🗑️ Cleaned up temporary file: ${tempFile}`);

      return result;

    } catch (error) {
      console.error('❌ Error processing base64 audio with SAMSM:', error);
      throw error;
    }
  }
}
