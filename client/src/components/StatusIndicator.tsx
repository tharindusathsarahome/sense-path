import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';

interface StatusIndicatorProps {
  isConnected: boolean;
  hasPermissions: boolean;
}

export default function StatusIndicator({ isConnected, hasPermissions }: StatusIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Pulse animation for connected status
    if (isConnected && hasPermissions) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
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
  }, [isConnected, hasPermissions]);

  const getStatusInfo = () => {
    if (!hasPermissions) {
      return {
        color: '#ff6b6b',
        icon: '⚠️',
        text: 'Permissions Required',
        subtext: 'Grant microphone, camera, and location access',
      };
    }
    
    if (!isConnected) {
      return {
        color: '#ffa726',
        icon: '🔄',
        text: 'Connecting...',
        subtext: 'Establishing connection to server',
      };
    }

    return {
      color: '#4caf50',
      icon: '☑',
      text: 'Ready',
      subtext: 'All systems operational',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Animated.View 
        style={[
          styles.indicator,
          {
            backgroundColor: statusInfo.color,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.icon}>{statusInfo.icon}</Text>
      </Animated.View>
      
      <View style={styles.textContainer}>
        <Text style={styles.statusText}>{statusInfo.text}</Text>
        <Text style={styles.subtitleText}>{statusInfo.subtext}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
  },
  indicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  icon: {
    fontSize: 25,
    color: '#e2e2e2ff',
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
});
