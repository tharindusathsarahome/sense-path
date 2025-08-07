import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Camera } from 'expo-camera';

const SERVER_URL = 'ws://192.168.1.82:3000';

interface WebSocketMessage {
  type: 'audio' | 'text' | 'connected' | 'error' | 'status';
  data?: string;
  message?: string;
  mimeType?: string;
  metadata?: {
    transcription?: string;
    response?: string;
  };
}

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [statusText, setStatusText] = useState('Requesting permissions...');
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      cleanup();
    };
  }, []);

  const requestPermissions = async () => {
    try {
      // Request audio recording permission
      const audioPermission = await Audio.requestPermissionsAsync();
      
      // Request camera permission
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      
      if (audioPermission.status === 'granted' && cameraPermission.status === 'granted') {
        setHasPermissions(true);
        setStatusText('Permissions granted. Ready to connect.');
        await setupAudio();
        connectToServer();
      } else {
        setStatusText('Permissions denied. Please enable microphone and camera access.');
        Alert.alert(
          'Permissions Required',
          'This app needs microphone and camera permissions to function properly.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setStatusText('Error requesting permissions');
    }
  };

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const connectToServer = () => {
    try {
      const ws = new WebSocket(SERVER_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setStatusText('Connected to server');
        console.log('✅ Connected to WebSocket server');
      };

      ws.onmessage = (event) => {
        try {
          console.log('📥 Received WebSocket message:', event.data.substring(0, 200) + '...');
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('🔍 Parsed message type:', message.type);
          handleServerMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          setStatusText('Error parsing server message');
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatusText('Disconnected from server');
        console.log('🔌 WebSocket connection closed');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!isConnected) {
            setStatusText('Attempting to reconnect...');
            connectToServer();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setStatusText('Connection error');
      };
    } catch (error) {
      console.error('Error connecting to server:', error);
      setStatusText('Failed to connect to server');
    }
  };

  const handleServerMessage = async (message: WebSocketMessage) => {
    console.log('🎯 Handling server message:', message.type);
    
    switch (message.type) {
      case 'connected':
        console.log('✅ Server connection confirmed');
        setStatusText('Ready to record');
        break;
      case 'audio':
        console.log('🎵 Received audio response from server');
        if (message.data) {
          console.log(`📊 Audio data length: ${message.data.length} characters`);
          
          // Show transcription and response in status if available
          if (message.metadata) {
            setStatusText(`🎤 "${message.metadata.transcription}" → 🤖 "${message.metadata.response}"`);
          }
          
          // Play the audio response
          await playAudioResponse(message.data);
        } else {
          console.log('⚠️  No audio data in message');
          setStatusText('Empty audio received');
        }
        break;
      case 'text':
        console.log('💬 Received text from server:', message.data);
        setStatusText(`${message.data}`);
        // Auto-clear after a few seconds to show ready state
        setTimeout(() => {
          setStatusText('Ready to record');
        }, 5000);
        break;
      case 'error':
        console.error('❌ Server error:', message.message);
        setStatusText(`Error: ${message.message}`);
        break;
      case 'status':
        console.log('ℹ️ Server status:', message.message);
        setStatusText(message.message || 'Processing...');
        break;
      default:
        console.log('⚠️  Unknown message type:', message.type);
    }
  };

  const playAudioResponse = async (audioBase64: string) => {
    try {
      console.log('🔊 Starting audio playback...');
      console.log(`📊 Audio data length: ${audioBase64.length} characters`);
      setStatusText('Playing AI response...');
      
      // Validate base64 data
      if (!audioBase64 || audioBase64.length === 0) {
        throw new Error('No audio data received');
      }

      // Use the recommended approach - write directly to cache directory
      const uri = FileSystem.cacheDirectory + 'response.wav';
      
      console.log('💾 Writing audio to cache:', uri);
      await FileSystem.writeAsStringAsync(uri, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📁 File created:', fileInfo);
      
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('Audio file was not created or is empty');
      }

      console.log('🎵 Loading audio for playback...');
      
      // Use simpler audio creation without extra configuration
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      
      console.log('✅ Audio loaded successfully');
      console.log('▶️ Starting playback...');
      
      // Set up completion handler
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('🏁 Audio playback finished');
          setStatusText('Ready to record');
          sound.unloadAsync();
          // Clean up the file
          FileSystem.deleteAsync(uri, { idempotent: true });
        }
      });
      
      // Start playback
      await sound.playAsync();
      
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // More specific error handling
      let errorMessage = 'Audio playback failed';
      if (error instanceof Error) {
        if (error.message.includes('AVFoundation') || error.message.includes('-11800')) {
          errorMessage = 'Audio format incompatible - server should send text instead';
          // Log this to help debug
          console.log('🚨 AVFoundation error detected - server may still be sending audio instead of text');
        } else if (error.message.includes('No audio data')) {
          errorMessage = 'No audio received from server';
        } else {
          errorMessage = `Audio error: ${error.message.substring(0, 50)}...`;
        }
      }
      
      setStatusText(errorMessage);
      
      // Clean up on error
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
    }
  };

  const startRecording = async () => {
    if (!hasPermissions || !isConnected) {
      console.log('⚠️  Cannot start recording - permissions or connection missing');
      Alert.alert('Error', 'Please ensure permissions are granted and server is connected');
      return;
    }

    try {
      console.log('🎤 Starting audio recording...');
      setStatusText('Recording...');
      setIsRecording(true);

      // Stop any existing recording
      if (recordingRef.current) {
        console.log('🔄 Stopping existing recording...');
        await recordingRef.current.stopAndUnloadAsync();
      }

      // Start new recording
      console.log('🆕 Creating new recording...');
      const recording = new Audio.Recording();
      console.log('🔧 Using HIGH_QUALITY preset for recording');
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      console.log('▶️  Starting recording...');
      await recording.startAsync();
      recordingRef.current = recording;
      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setStatusText('Error starting recording');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) {
      console.log('⚠️  No recording to stop');
      return;
    }

    try {
      console.log('⏹️  Stopping recording...');
      setStatusText('Processing...');
      setIsRecording(false);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      console.log('📁 Recording saved to:', uri);
      
      if (uri && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('📖 Reading recorded audio file...');
        // Read the recorded audio file
        const audioBase64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log(`📊 Audio file read: ${audioBase64.length} characters`);
        
        // Get file info for debugging
        const fileInfo = await FileSystem.getInfoAsync(uri);
        console.log('📋 File info:', fileInfo);

        // Send to server
        const messageToSend = {
          type: 'audio',
          data: audioBase64,
          mimeType: 'audio/wav'
        };
        
        console.log('📤 Sending audio to server...');
        console.log(`📊 Message size: ${JSON.stringify(messageToSend).length} characters`);
        
        wsRef.current.send(JSON.stringify(messageToSend));
        console.log('✅ Audio sent to server');

        setStatusText('Sent to AI, waiting for response...');
        
        // Save a copy for debugging before deleting
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const debugFileName = `recorded_audio_${timestamp}.wav`;
        const debugPath = FileSystem.documentDirectory + debugFileName;
        
        try {
          await FileSystem.copyAsync({
            from: uri,
            to: debugPath
          });
          console.log(`💾 Debug copy saved: ${debugPath}`);
        } catch (copyError) {
          console.log('⚠️  Could not save debug copy:', copyError);
        }
        
        // Clean up the original recording file
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('🧹 Original recording file cleaned up');
      } else {
        console.log('❌ Cannot send - not connected to server');
        console.log(`WebSocket ready state: ${wsRef.current?.readyState}`);
        setStatusText('Error: Not connected to server');
      }
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      setStatusText('Error processing recording');
    }

    recordingRef.current = null;
    console.log('🔄 Recording reference cleared');
  };

  const handleButtonPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const cleanup = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error cleaning up recording:', error);
      }
    }

    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error('Error cleaning up sound:', error);
      }
    }

    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const getButtonColor = () => {
    if (!hasPermissions || !isConnected) return '#cccccc';
    return isRecording ? '#ff4444' : '#44ff44';
  };

  const getButtonText = () => {
    if (!hasPermissions) return 'No Permissions';
    if (!isConnected) return 'Not Connected';
    return isRecording ? 'Stop Recording' : 'Start Recording';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Voice Chat</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{statusText}</Text>
        <View style={[styles.statusIndicator, { 
          backgroundColor: isConnected ? '#44ff44' : '#ff4444' 
        }]} />
      </View>

      <TouchableOpacity
        style={[styles.recordButton, { backgroundColor: getButtonColor() }]}
        onPress={handleButtonPress}
        disabled={!hasPermissions || !isConnected}
      >
        <Text style={styles.buttonText}>{getButtonText()}</Text>
      </TouchableOpacity>

      <Text style={styles.instructions}>
        {hasPermissions 
          ? 'Tap the button to start/stop recording. Speak your message and wait for AI response.'
          : 'Please grant microphone and camera permissions to use this app.'
        }
      </Text>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginRight: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
