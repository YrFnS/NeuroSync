import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppMode } from './types';
import { LiquidDisplay } from './components/LiquidDisplay';
import { BatteryWarning } from './components/BatteryWarning';
import { DebugMenu } from './components/DebugMenu';
import { StatusHeader } from './components/StatusHeader';
import { GestureLayer } from './components/GestureLayer';
import { useLiveSession } from './hooks/useLiveSession';
import { useGeolocation } from './hooks/useGeolocation';
import { useBattery } from './hooks/useBattery';
import { useShake } from './hooks/useShake';
import { useNeuroState } from './hooks/useNeuroState';
import { useAudioFeedback } from './hooks/useAudioFeedback';
import { useCamera } from './hooks/useCamera';
import { useOfflineVision } from './hooks/useOfflineVision';
import { soundEngine } from './utils/soundEngine';
import { memoryStore } from './utils/memoryStore';
import { AlertOctagon } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const { state, dispatch, stateRef } = useNeuroState();
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [showDebug, setShowDebug] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);

  // --- SENSORS & CAMERA ---
  const { location } = useGeolocation();
  const { level: batteryLevel, charging: isCharging, supported: batterySupported } = useBattery();
  // Shared Camera Stream for both Gemini (Online) and TensorFlow (Offline)
  const { stream: cameraStream, error: cameraError } = useCamera();
  
  // --- OFFLINE CORTEX ---
  useOfflineVision({
    stream: cameraStream,
    isOffline: state.mode === AppMode.OFFLINE,
    onDetections: (objects) => {
        dispatch({ type: 'UPDATE_OFFLINE_DETECTIONS', payload: objects });
    }
  });

  // --- SIDE EFFECTS ---
  useAudioFeedback(state);

  // Sync Location to State
  useEffect(() => {
    if (location) dispatch({ type: 'UPDATE_LOCATION', payload: location });
  }, [location, dispatch]);

  // Handle Theme
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isLightTheme ? '#FFFFFF' : '#000000');
    }
  }, [isLightTheme]);

  // Initial Startup & Mode Management
  useEffect(() => {
     // Start in Offline mode until connected
     if (state.mode === AppMode.IDLE && !isConnected) {
         dispatch({ type: 'SET_MODE', payload: AppMode.OFFLINE });
     }

     const timer = setTimeout(() => {
         // Attempt to speak, but browser may block if no interaction.
         soundEngine.speakSystem("NeuroSync Online. Double tap screen to connect. Swipe down with two fingers for privacy curtain.");
     }, 1000);
     return () => clearTimeout(timer);
  }, []);

  // Low Battery Warning
  const isLowBattery = batterySupported && !isCharging && batteryLevel <= 0.20;
  useEffect(() => {
    if (isLowBattery) {
        soundEngine.playBatteryLow();
        soundEngine.speakSystem("Warning. Battery critically low.");
    }
  }, [isLowBattery, batterySupported, isCharging, batteryLevel]);

  // Shake to Reset
  useShake(15, () => {
    if (state.mode !== AppMode.IDLE && state.mode !== AppMode.GUARDIAN && state.mode !== AppMode.OFFLINE) {
       soundEngine.playReset();
       soundEngine.speakSystem("Resetting interface.");
       if (navigator.vibrate) navigator.vibrate(200);
       dispatch({ type: 'SET_MODE', payload: isConnected ? AppMode.IDLE : AppMode.OFFLINE });
    }
  });

  // --- AI INTEGRATION ---
  const handleTranscript = useCallback((text: string, isUser: boolean) => {
      // Accumulate transcript lines
      const prefix = isUser ? "USER: " : "AI: ";
      dispatch({ type: 'ADD_TRANSCRIPT', payload: `${prefix}${text}` });
  }, [dispatch]);

  const getSnapshotRef = useRef<() => string | undefined>(() => undefined);

  const handleToolCall = useCallback(async (name: string, args: any) => {
    if (name !== 'logEnvironmentalEvent' && name !== 'queryMemory') {
         dispatch({ type: 'ADD_TRANSCRIPT', payload: `ACTION: ${name} (${JSON.stringify(args)})` });
    }

    if (name === 'updateInterface') {
      if (args.mode === 'NAVIGATION') {
        dispatch({ type: 'UPDATE_NAV', payload: { direction: args.direction, distance: args.distance } });
      } else if (args.mode === 'READING') {
        dispatch({ type: 'UPDATE_READ', payload: { text: args.extractedText } });
      } else if (args.mode === 'SCANNING') {
        dispatch({ type: 'UPDATE_SCAN', payload: { objectName: args.objectDescription, details: "Identified via Gemini Vision" } });
      } else {
        dispatch({ type: 'SET_MODE', payload: AppMode.IDLE });
      }
      return { success: true };
    } 
    else if (name === 'triggerDanger') {
      dispatch({ type: 'TRIGGER_DANGER', payload: args.hazardDescription });
      
      // Auto-log danger to memory
      try {
        const snapshot = getSnapshotRef.current();
        const baseLat = stateRef.current.guardianData.location?.lat || 0;
        const baseLng = stateRef.current.guardianData.location?.lng || 0;
        await memoryStore.addEvent({
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: 'HAZARD_DETECTED',
            description: args.hazardDescription,
            coordinates: baseLat !== 0 ? { lat: baseLat, lng: baseLng } : undefined,
            snapshot
        });
      } catch (e) { console.error("Failed to auto-log hazard", e); }

      return { success: true };
    } 
    else if (name === 'activateGuardian') {
      dispatch({ type: 'ACTIVATE_GUARDIAN' });
      soundEngine.speakSystem("Guardian Protocol Initiated. Help is on the way.");
      return { success: true };
    } 
    else if (name === 'provideEmergencyPlan') {
      dispatch({ type: 'UPDATE_PLAN', payload: args });
      return { success: true };
    }
    else if (name === 'logEnvironmentalEvent') {
      const snapshot = getSnapshotRef.current();
      
      // 1. Dispatch to UI state for immediate feedback
      dispatch({ type: 'LOG_EVENT', payload: { type: args.type, description: args.description, snapshot } });
      soundEngine.playSuccess();
      
      // 2. Persist to Memory Palace (IndexedDB)
      try {
          const baseLat = stateRef.current.guardianData.location?.lat || 0;
          const baseLng = stateRef.current.guardianData.location?.lng || 0;
          
          await memoryStore.addEvent({
              id: Date.now().toString(),
              timestamp: Date.now(),
              type: args.type,
              description: args.description,
              coordinates: baseLat !== 0 ? { lat: baseLat, lng: baseLng } : undefined,
              snapshot
          });
      } catch(e) { console.error("Persistence failed", e); }

      return { success: true, message: "Event logged to memory with visual evidence." };
    } 
    else if (name === 'queryMemory') {
      const query = args.query.toLowerCase();
      // Search persistent store
      const memories = await memoryStore.searchMemories(query);
      return { found: memories.length > 0, memories: memories.slice(0, 5) };
    }
    return { status: "unknown_tool" };
  }, [dispatch, stateRef]);

  const { connect, disconnect, isConnected, error: sessionError, getSnapshot } = useLiveSession({
    onToolCall: handleToolCall,
    onTranscript: handleTranscript,
    apiKey,
    mode: state.mode,
    location,
    videoStream: cameraStream // Pass shared stream
  });

  // Keep snapshot ref updated
  useEffect(() => { getSnapshotRef.current = getSnapshot; }, [getSnapshot]);

  const error = sessionError || cameraError;

  // Error Feedback
  useEffect(() => {
    if (error) soundEngine.speakSystem(`System Error: ${error}`);
  }, [error]);

  // --- GESTURE HANDLERS ---
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
      // Optimistically switch to IDLE waiting for connection
      dispatch({ type: 'SET_MODE', payload: AppMode.IDLE });
      connect();
    }
  };

  const handleSingleTap = () => {
    if (isConnected) {
        soundEngine.speakSystem(`System Active. Mode: ${state.mode}. Battery ${Math.round(batteryLevel * 100)} percent.`);
    } else {
        soundEngine.speakSystem("Offline Safe Mode. Double tap to connect.");
    }
  };

  const handleGuardianTrigger = () => {
    if (state.mode !== AppMode.GUARDIAN) {
        dispatch({ type: 'ACTIVATE_GUARDIAN' });
        soundEngine.speakSystem("Emergency Guardian Mode Activated.");
    }
  };

  // --- RENDER ---
  return (
    <div className={`h-[100dvh] w-screen overflow-hidden flex flex-col font-sans relative transition-colors duration-300 ${isLightTheme ? 'theme-light bg-neuro-bg text-neuro-text' : 'bg-black text-white'}`}>
      
      <GestureLayer 
        onDoubleTap={toggleConnection}
        onLongPress={handleGuardianTrigger}
        onSingleTap={handleSingleTap}
        isConnected={isConnected}
        privacyMode={privacyMode}
        setPrivacyMode={setPrivacyMode}
      />

      <StatusHeader 
        mode={state.mode}
        isConnected={isConnected}
        privacyMode={privacyMode}
        onActivateGuardian={() => dispatch({ type: 'ACTIVATE_GUARDIAN' })}
      />

      {error && (
         <div className="absolute top-32 left-4 right-4 z-[60] bg-[#FF4D00] text-white p-4 rounded-xl border-4 border-white flex items-center gap-4 animate-bounce" role="alert">
            <AlertOctagon size={48} strokeWidth={3} />
            <div>
               <h2 className="text-2xl font-black uppercase">System Error</h2>
               <p className="font-bold">{error}</p>
            </div>
         </div>
      )}
      
      {isLowBattery && <BatteryWarning level={batteryLevel} />}

      <main className="flex-1 relative z-0 h-full w-full bg-neuro-bg" role="main" aria-live="polite">
         <LiquidDisplay 
            state={state} 
            videoStream={cameraStream} 
            onExitGuardian={() => dispatch({ type: 'SET_MODE', payload: isConnected ? AppMode.IDLE : AppMode.OFFLINE })}
         />
      </main>

      {/* Floating Hints */}
      {state.mode !== AppMode.GUARDIAN && !isConnected && !privacyMode && state.mode !== AppMode.OFFLINE && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[40] flex flex-col items-center justify-center w-full pointer-events-none opacity-50">
             <div className="animate-bounce mb-2 text-center">
                <p className="font-bold uppercase tracking-widest text-sm">Double Tap Screen</p>
                <p className="text-xs opacity-70">to Connect</p>
             </div>
        </div>
      )}
      
      {isConnected && !privacyMode && state.mode !== AppMode.GUARDIAN && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[40] pointer-events-none">
             <div className="w-16 h-1 bg-[#FFD600] rounded-full shadow-[0_0_10px_#FFD600] animate-pulse"></div>
          </div>
      )}

      <DebugMenu 
        show={showDebug}
        onClose={() => setShowDebug(false)}
        onToggleDebug={() => setShowDebug(!showDebug)}
        dispatch={dispatch}
        apiKey={apiKey}
        setApiKey={setApiKey}
        isLightTheme={isLightTheme}
        toggleTheme={() => setIsLightTheme(!isLightTheme)}
      />

    </div>
  );
};

export default App;