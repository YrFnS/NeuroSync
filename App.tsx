
import React, { useState, useEffect } from 'react';
import { AppMode } from './types';
import { useNeuroState } from './hooks/useNeuroState';
import { useAudioFeedback } from './hooks/useAudioFeedback';
import { useNeuroSensors } from './hooks/useNeuroSensors';
import { useGeminiIntegration } from './hooks/useGeminiIntegration';
import { NeuroInterface } from './components/NeuroInterface';
import { soundEngine } from './utils/soundEngine';

const App: React.FC = () => {
  // --- STATE CORE ---
  const { state, dispatch, stateRef } = useNeuroState();
  
  // --- UI STATE ---
  // Persist API Key to LocalStorage for better DX
  const [apiKey, setApiKey] = useState(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('NEURO_API_KEY') || process.env.API_KEY || '';
      }
      return process.env.API_KEY || '';
  });
  const [showDebug, setShowDebug] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);

  // Sync API Key to Storage
  useEffect(() => {
      if (apiKey) localStorage.setItem('NEURO_API_KEY', apiKey);
  }, [apiKey]);

  // --- AUDIO FEEDBACK ---
  useAudioFeedback(state);

  // --- AUDIO CONTEXT UNLOCKER ---
  // Critical for Mobile Safari/Chrome: Resumes AudioContext on first physical interaction
  useEffect(() => {
      const unlockAudio = () => {
          soundEngine.init();
          soundEngine.getContext()?.resume();
          // Remove listeners once unlocked
          document.removeEventListener('touchstart', unlockAudio);
          document.removeEventListener('click', unlockAudio);
      };
      document.addEventListener('touchstart', unlockAudio);
      document.addEventListener('click', unlockAudio);
      return () => {
          document.removeEventListener('touchstart', unlockAudio);
          document.removeEventListener('click', unlockAudio);
      };
  }, []);

  // --- THEME ---
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isLightTheme ? '#FFFFFF' : '#000000');
    }
  }, [isLightTheme]);
  
  // --- SENSORS & SIDE EFFECTS ---
  const sensors = useNeuroSensors(state, dispatch, state.mode !== AppMode.OFFLINE, showDebug);
  
  // --- GEMINI AI INTEGRATION ---
  const { connect, disconnect, isConnected, error: sessionError } = useGeminiIntegration(
      state, 
      dispatch, 
      stateRef, 
      apiKey, 
      sensors.location, 
      sensors.cameraStream
  );

  const totalError = sessionError || sensors.cameraError;

  // --- STARTUP LOGIC ---
  useEffect(() => {
     if (state.mode === AppMode.IDLE && !isConnected) {
         dispatch({ type: 'SET_MODE', payload: AppMode.OFFLINE });
     }
     const timer = setTimeout(() => {
         soundEngine.speakSystem("NeuroSync Online. Double tap screen to connect. Swipe down with two fingers for privacy curtain.");
     }, 1000);
     return () => clearTimeout(timer);
  }, []);

  // --- ERROR FEEDBACK ---
  useEffect(() => {
    if (totalError) soundEngine.speakSystem(`System Error: ${totalError}`);
  }, [totalError]);

  // --- CONNECTION TOGGLER ---
  const toggleConnection = () => {
    if (isConnected) {
      soundEngine.speakSystem("Disconnecting. Engaging Offline Cortex.");
      disconnect();
      dispatch({ type: 'SET_MODE', payload: AppMode.OFFLINE });
    } else {
      if (!apiKey) {
        soundEngine.speakSystem("Error. API Key missing.");
        alert("Please set API_KEY in settings.");
        setShowDebug(true); // Auto-open debug menu
        return;
      }
      soundEngine.speakSystem("Connecting to Gemini Live.");
      soundEngine.playModeSwitch();
      dispatch({ type: 'SET_MODE', payload: AppMode.IDLE });
      connect();
    }
  };

  return (
    <NeuroInterface 
        state={state}
        dispatch={dispatch}
        cameraStream={sensors.cameraStream}
        batteryLevel={sensors.batteryLevel}
        isLowBattery={sensors.isLowBattery}
        isConnected={isConnected}
        error={totalError}
        onToggleConnection={toggleConnection}
        apiKey={apiKey}
        setApiKey={setApiKey}
        showDebug={showDebug}
        setShowDebug={setShowDebug}
        privacyMode={privacyMode}
        setPrivacyMode={setPrivacyMode}
        isLightTheme={isLightTheme}
        toggleTheme={() => setIsLightTheme(!isLightTheme)}
    />
  );
};

export default App;
