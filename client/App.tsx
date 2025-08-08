import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import WelcomeScreen from './src/screens/WelcomeScreen';
import MainScreen from './src/screens/MainScreen';

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);

  const handleGetStarted = () => {
    setShowWelcome(false);
  };

  const handleBack = () => {
    setShowWelcome(true);
  };

  return (
    <>
      {showWelcome ? (
        <WelcomeScreen onGetStarted={handleGetStarted} />
      ) : (
        <MainScreen onBack={handleBack} />
      )}
      <StatusBar style="light" />
    </>
  );
}
