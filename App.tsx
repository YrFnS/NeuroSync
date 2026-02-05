
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
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [showDebug, setShowDebug] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);

  // --- AUDIO FEEDBACK ---
  useAudioFeedback(state);

  // --- THEME ---
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isLightTheme ? '#FFFFFF' : '#000000');
    }
  }, [isLightTheme]);

  // --- AI LOGIC PLACEHOLDER (Need this for sensors to know if connected) ---
  // We don't have the real isConnected value yet, so we pass a ref or wait.
  // Actually, we can just pass the value after we initialize the AI hook.
  
  // --- SENSORS & SIDE EFFECTS ---
  // We need to know connection status for "Shake to Reset" logic
  // But connection status comes from Gemini Hook. 
  // To avoid circular dependency, we'll use a local state for connected status that the hook updates?
  // Easier: NeuroSensors takes `state.mode` which implies connection mostly, but let's pass a boolean.
  // We will pass `state.mode !== AppMode.OFFLINE` as a proxy or fix the order.
  
  // To solve this properly, we instantiate Gemini Hook first? No, Gemini needs camera stream from sensors.
  // Solution: We split Camera out? No.
  // We will let Sensors hook take a simple boolean that we pass in.
  
  // Actually, let's declare the variable `isConnected` from the future hook result.
  // Since we can't look into the future, we split the logic.
  // However, `useNeuroSensors` mainly needs `isConnected` for the Shake action. 
  // We can pass `state.mode !== AppMode.OFFLINE` which is "effectively" connected for the logic we need.

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
        alert("Please set API_KEY in env or use the debug panel.");
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
