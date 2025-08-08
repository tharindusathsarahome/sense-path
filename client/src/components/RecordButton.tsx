import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  Animated,
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface RecordButtonProps {
  isRecording: boolean;
  isEnabled: boolean;
  onPress: () => void;
}

export default function RecordButton({ isRecording, isEnabled, onPress }: RecordButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      // Start ripple effect
      Animated.loop(
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();

      // Start pulse effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animations
      rippleAnim.setValue(0);
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.3, 0],
  });

  const getButtonColors = (): [string, string] => {
    if (!isEnabled) return ['#cccccc', '#999999'];
    return isRecording ? ['#bf47ffff', '#ff37d7ff'] : ['#2eb4d5ff', '#1d89d1ff'];
  };

  const getButtonText = () => {
    if (!isEnabled) return '🔒';
    return isRecording ? '⏹️' : '🎤';
  };

  const getStatusText = () => {
    if (!isEnabled) return 'System Not Ready';
    return isRecording ? 'Press to Stop Recording' : 'Press to Speak';
  };

  return (
    <View style={styles.container}>
      {/* Ripple Effect */}
      {isRecording && (
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />
      )}

      {/* Main Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!isEnabled}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={getButtonColors()}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.buttonIcon}>{getButtonText()}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Status Text */}
      <Text style={[styles.statusText, { color: isEnabled ? '#ffffff' : '#cccccc' }]}>
        {getStatusText()}
      </Text>

      {/* Recording Indicator */}
      {/* {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Listening for guidance request...</Text>
        </View>
      )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 75,
    elevation: 10,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  ripple: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 71, 87, 0.9)',
    borderRadius: 20,
  },
  recordingDot: {
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
