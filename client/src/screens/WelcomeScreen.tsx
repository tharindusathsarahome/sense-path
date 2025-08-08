import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequential animations for a smooth entrance
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const logoRotation = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
          },
        ]}
      >
        {/* Logo/Icon */}
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              transform: [{ rotate: logoRotation }],
            },
          ]}
        >
          <View style={styles.logo}>
            <Text style={styles.logoText}>👁️</Text>
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.Text 
          style={[
            styles.title,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          SensePath
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text 
          style={[
            styles.subtitle,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          Cognitive AI Navigation Assistant
        </Animated.Text>

        {/* Mission Statement */}
        <Animated.Text 
          style={[
            styles.missionText,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          Empowering independence through intelligent guidance
        </Animated.Text>

        {/* Features */}
        <Animated.View 
          style={[
            styles.featuresContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* <FeatureItem icon="🧠" text="Cognitive AI-Powered Analysis" />
          <FeatureItem icon="👁️" text="Visual Scene Understanding" />
          <FeatureItem icon="🗣️" text="Natural Voice Interaction" />
          <FeatureItem icon="�" text="Intelligent Navigation Guidance" />
          <FeatureItem icon="⚠️" text="Real-time Hazard Detection" />
          <FeatureItem icon="🔒" text="Privacy & Accessibility Focused" /> */}
        </Animated.View>

        {/* Get Started Button */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={onGetStarted}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ff6b6b', '#ff8e53']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Start Journey</Text>
              <Text style={styles.buttonIcon}>🧭</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Floating particles effect */}
      <FloatingParticles />
    </LinearGradient>
  );
}

const FeatureItem = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const FloatingParticles = () => {
  const particles = Array.from({ length: 6 }, (_, i) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      const animate = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 3000 + i * 500,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 0,
              duration: 3000 + i * 500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      
      setTimeout(animate, i * 1000);
    }, []);

    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -100],
    });

    const opacity = animatedValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 0.8, 0.3],
    });

    return (
      <Animated.View
        key={i}
        style={[
          styles.particle,
          {
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      />
    );
  });

  return <>{particles}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontSize: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '300',
  },
  missionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 40,
    textAlign: 'center',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 50,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  getStartedButton: {
    width: '80%',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 10,
  },
  buttonIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 3,
  },
});
