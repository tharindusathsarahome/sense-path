import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';

interface ModeDisplayProps {
  currentMode: string;
  isActive: boolean;
}

export default function ModeDisplay({ currentMode, isActive }: ModeDisplayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
  }, [isActive]);

  const getModeIcon = (mode: string) => {
    const modeIcons: { [key: string]: string } = {
      'Navigation': '🧭',
      'Weather': '🌤️',
      'Face Recognition': '👤',
      'Scene Analysis': '👁️',
      'Obstacle Detection': '⚠️',
      'Route Planning': '🗺️',
      'Light Detection': '💡',
      'Object Recognition': '🔍',
      'Emergency': '🚨',
      'Assistant': '🤖',
      'Default': '🧠'
    };

    // Find the best match or use default
    const matchedMode = Object.keys(modeIcons).find(key => 
      mode.toLowerCase().includes(key.toLowerCase())
    );
    
    return modeIcons[matchedMode || 'Default'];
  };

  const getModeColor = (mode: string) => {
    const modeColors: { [key: string]: string } = {
      'Navigation': '#4caf50',
      'Weather': '#2196f3',
      'Face Recognition': '#ff9800',
      'Scene Analysis': '#9c27b0',
      'Obstacle Detection': '#f44336',
      'Route Planning': '#00bcd4',
      'Light Detection': '#ffeb3b',
      'Object Recognition': '#607d8b',
      'Emergency': '#e91e63',
      'Assistant': '#3f51b5',
      'Default': '#795548'
    };

    const matchedMode = Object.keys(modeColors).find(key => 
      mode.toLowerCase().includes(key.toLowerCase())
    );
    
    return modeColors[matchedMode || 'Default'];
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: pulseAnim }],
          borderColor: getModeColor(currentMode),
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: getModeColor(currentMode) }]}>
        <Text style={styles.icon}>{getModeIcon(currentMode)}</Text>
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.modeLabel}>Active Mode</Text>
        <Text style={styles.modeText}>{currentMode}</Text>
      </View>
      
      {isActive && (
        <View style={[styles.indicator, { backgroundColor: getModeColor(currentMode) }]} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  icon: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    marginBottom: 2,
  },
  modeText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});
