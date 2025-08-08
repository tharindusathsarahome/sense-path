import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';

interface LocationDisplayProps {
  location: Location.LocationObject | null;
  hasPermissions: boolean;
  onRefresh: () => void;
}

export default function LocationDisplay({ location, hasPermissions, onRefresh }: LocationDisplayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRefresh = () => {
    // Rotation animation for refresh button
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
    });
    
    onRefresh();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getLocationText = () => {
    if (!hasPermissions) {
      return 'Location access denied';
    }
    
    if (!location) {
      return 'Getting location...';
    }

    const { latitude, longitude } = location.coords;
    return `📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  const getAccuracyText = () => {
    if (!location || !hasPermissions) return '';
    
    const accuracy = location.coords.accuracy;
    if (accuracy) {
      return `±${Math.round(accuracy)}m accuracy`;
    }
    return '';
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.locationInfo}>
        <Text style={styles.locationText}>{getLocationText()}</Text>
        {getAccuracyText() && (
          <Text style={styles.accuracyText}>{getAccuracyText()}</Text>
        )}
      </View>
      
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <TouchableOpacity
          style={[
            styles.refreshButton,
            { opacity: hasPermissions ? 1 : 0.5 }
          ]}
          onPress={handleRefresh}
          disabled={!hasPermissions}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  refreshIcon: {
    fontSize: 18,
  },
});
