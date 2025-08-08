import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

// Components
import {
  RecordButton,
  StatusIndicator,
  LocationDisplay,
  ModeDisplay,
} from '../components';

// Types
import { WebSocketMessage } from '../types';

const { width, height } = Dimensions.get('window');
const SERVER_URL = 'ws://192.168.1.82:3000';

interface MainScreenProps {
  onBack: () => void;
}

export default function MainScreen({ onBack }: MainScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [statusText, setStatusText] = useState('Initializing SensePath...');
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState<string>('Navigation');
  const [aiResponse, setAiResponse] = useState<string>('');
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const backgroundColorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeApp();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    // Background color animation based on connection status
    Animated.timing(backgroundColorAnim, {
      toValue: isConnected ? 1 : 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [isConnected]);

  useEffect(() => {
    // Pulse animation when recording
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const initializeApp = async () => {
    await requestPermissions();
  };

  const requestPermissions = async () => {
    try {
      setStatusText('Requesting camera and microphone access...');
      
      const audioPermission = await Audio.requestPermissionsAsync();
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      
      if (audioPermission.status === 'granted' && 
          cameraPermission.status === 'granted' && 
          locationPermission.status === 'granted') {
        setHasPermissions(true);
        setStatusText('Configuring AI systems...');
        await setupAudio();
        setStatusText('Acquiring location for context...');
        await getCurrentLocation();
        connectToServer();
      } else {
        setStatusText('Permissions required for AI assistance');
        showPermissionAlert();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setStatusText('Error accessing device features');
    }
  };

  const showPermissionAlert = () => {
    Alert.alert(
      'Device Access Required',
      'SensePath needs camera, microphone, and location access to provide intelligent navigation assistance for visual accessibility.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Grant Access', onPress: requestPermissions },
      ]
    );
  };

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location);
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      setStatusText('Error getting location. Continuing without location...');
      return null;
    }
  };

  const connectToServer = () => {
    try {
      setStatusText('Connecting to AI cognitive system...');
      const ws = new WebSocket(SERVER_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setStatusText('AI system ready - Speak your navigation needs');
        console.log('✅ Connected to WebSocket server');
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleServerMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          setStatusText('Error parsing server message');
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatusText('AI system disconnected - Reconnecting...');
        
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          if (!isConnected) {
            setStatusText('Attempting to reconnect to AI system...');
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
    switch (message.type) {
      case 'connected':
        setStatusText('Cognitive AI system ready for navigation assistance');
        break;
      case 'audio':
        if (message.data) {
          if (message.metadata) {
            const transcription = message.metadata.transcription || '';
            const response = message.metadata.response || '';
            
            // Extract mode information if present in the response
            const modeMatch = response.match(/Mode:\s*([^\n]+)/i) || response.match(/\[([^\]]+)\]/);
            if (modeMatch) {
              setCurrentMode(modeMatch[1].trim());
            }
            
            setStatusText(`🎤 "${transcription}"`);
            setAiResponse(response);
          }
          await playAudioResponse(message.data);
        }
        break;
      case 'text':
        // Extract mode information from text response
        const textData = message.data || '';
        const modeMatch = textData.match(/Mode:\s*([^\n]+)/i) || textData.match(/\[([^\]]+)\]/);
        if (modeMatch) {
          setCurrentMode(modeMatch[1].trim());
        }
        
        setStatusText(textData);
        setAiResponse(textData);
        setTimeout(() => setStatusText('Ready for next request'), 5000);
        break;
      case 'error':
        setStatusText(`AI System Error: ${message.message}`);
        break;
      case 'status':
        setStatusText(message.message || 'Processing with cognitive AI...');
        break;
    }
  };

  const playAudioResponse = async (audioBase64: string) => {
    try {
      setStatusText('Playing AI response...');
      
      const uri = FileSystem.cacheDirectory + 'response.wav';
      await FileSystem.writeAsStringAsync(uri, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('Audio file was not created or is empty');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setStatusText('Ready to record');
          sound.unloadAsync();
          FileSystem.deleteAsync(uri, { idempotent: true });
          
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      setStatusText('Audio playback failed');
      
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (audioModeError) {
        console.error('Error restoring audio mode:', audioModeError);
      }
    }
  };

  const startRecording = async () => {
    if (!hasPermissions || !isConnected) {
      Alert.alert('Error', 'Please ensure permissions are granted and server is connected');
      return;
    }

    try {
      setStatusText('Recording...');
      setIsRecording(true);

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setStatusText('Error starting recording');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setStatusText('Processing...');
      setIsRecording(false);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      if (uri && wsRef.current?.readyState === WebSocket.OPEN) {
        const audioBase64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const messageToSend = {
          type: 'audio',
          data: audioBase64,
          mimeType: 'audio/wav',
          location: currentLocation ? {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude
          } : undefined
        };
        
        wsRef.current.send(JSON.stringify(messageToSend));
        setStatusText('Sent to AI, waiting for response...');
        
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } else {
        setStatusText('Error: Not connected to server');
      }
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      setStatusText('Error processing recording');
    }

    recordingRef.current = null;
  };

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const refreshLocation = async () => {
    if (!hasPermissions) {
      Alert.alert('Error', 'Location permission not granted');
      return;
    }
    
    setStatusText('Refreshing location...');
    await getCurrentLocation();
    setStatusText('Location updated');
    setTimeout(() => setStatusText('Ready to record'), 2000);
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

  const backgroundColorInterpolation = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(102, 126, 234, 0.8)', 'rgba(76, 175, 80, 0.8)'],
  });

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View style={{ flex: 1, backgroundColor: backgroundColorInterpolation }}>
        <LinearGradient
          colors={isConnected ? ['#667eea', '#764ba2', '#f093fb'] : ['#667ceaff', '#a43aadff', '#ff65baff']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View 
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            }}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>SensePath</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Mode Display */}
            {/* <ModeDisplay 
              currentMode={currentMode} 
              isActive={isConnected} 
            /> */}

            {/* Status Section */}
            <View style={styles.statusSection}>
              <StatusIndicator isConnected={isConnected} hasPermissions={hasPermissions} />
              <Text style={styles.statusText}>{statusText}</Text>
            </View>

            {/* Location Display */}
            <LocationDisplay 
              location={currentLocation} 
              hasPermissions={hasPermissions}
              onRefresh={refreshLocation}
            />

            {/* Record Button */}
            <Animated.View 
              style={[
                styles.recordButtonContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <RecordButton
                isRecording={isRecording}
                isEnabled={hasPermissions && isConnected}
                onPress={handleRecordPress}
              />
            </Animated.View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructions}>
                {hasPermissions 
                  ? isConnected
                    ? 'Press the button and speak your navigation needs. SensePath will analyze your environment and provide intelligent guidance.'
                    : 'Connecting to cognitive AI system...'
                  : 'Please grant camera, microphone, and location access to enable AI navigation assistance.'
                }
              </Text>
              {/* {aiResponse && (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseLabel}>AI Guidance:</Text>
                  <Text style={styles.responseText}>{aiResponse}</Text>
                </View>
              )} */}
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold' as const,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  placeholder: {
    width: 40,
  },
  statusSection: {
    alignItems: 'center' as const,
    paddingVertical: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center' as const,
    marginTop: 10,
    paddingHorizontal: 20,
    fontWeight: '500' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  recordButtonContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  instructionsContainer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
    alignItems: 'center' as const,
  },
  instructions: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center' as const,
    lineHeight: 22,
    fontWeight: '400' as const,
    marginBottom: 15,
  },
  responseContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  responseLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600' as const,
    marginBottom: 5,
    textTransform: 'uppercase' as const,
  },
  responseText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
    fontWeight: '400' as const,
  },
};
