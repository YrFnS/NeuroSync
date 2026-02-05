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
import { soundEngine } from './utils/soundEngine';
import { AlertOctagon } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const { state, dispatch, stateRef } = useNeuroState();
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [showDebug, setShowDebug] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);

  // --- SENSORS ---
  const { location } = useGeolocation();
  const { level: batteryLevel, charging: isCharging, supported: batterySupported } = useBattery();
  
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

  // Initial Startup
  useEffect(() => {
     const timer = setTimeout(() => {
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
    if (state.mode !== AppMode.IDLE && state.mode !== AppMode.GUARDIAN) {
       soundEngine.playReset();
       soundEngine.speakSystem("Resetting interface.");
       if (navigator.vibrate) navigator.vibrate(200);
       dispatch({ type: 'SET_MODE', payload: AppMode.IDLE });
    }
  });

  // --- AI INTEGRATION ---
  const handleTranscript = (text: string) => {};
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
      dispatch({ type: 'LOG_EVENT', payload: { type: args.type, description: args.description, snapshot } });
      soundEngine.playSuccess();
      return { success: true, message: "Event logged to memory with visual evidence." };
    } 
    else if (name === 'queryMemory') {
      const query = args.query.toLowerCase();
      // Access current state via ref to avoid closure staleness
      const memories = stateRef.current.guardianData.eventLog.filter(e => 
        e.description.toLowerCase().includes(query) || 
        e.type.toLowerCase().includes(query)
      );
      return { found: memories.length > 0, memories: memories.slice(0, 5) };
    }
    return { status: "unknown_tool" };
  }, [dispatch, stateRef]);

  const { connect, disconnect, isConnected, videoStream, error, getSnapshot } = useLiveSession({
    onToolCall: handleToolCall,
    onTranscript: handleTranscript,
    apiKey,
    mode: state.mode,
    location
  });

  // Keep snapshot ref updated
  useEffect(() => { getSnapshotRef.current = getSnapshot; }, [getSnapshot]);

  // Error Feedback
  useEffect(() => {
    if (error) soundEngine.speakSystem(`System Error: ${error}`);
  }, [error]);

  // --- GESTURE HANDLERS ---
  const toggleConnection = () => {
    if (isConnected) {
      soundEngine.speakSystem("Disconnecting.");
      disconnect();
      dispatch({ type: 'SET_MODE', payload: AppMode.IDLE });
    } else {
      if (!apiKey) {
        soundEngine.speakSystem("Error. API Key missing.");
        alert("Please set API_KEY in env or use the debug panel.");
        return;
      }
      soundEngine.speakSystem("Connecting to Gemini Live.");
      soundEngine.playModeSwitch();
      connect();
    }
  };

  const handleSingleTap = () => {
    if (isConnected) {
        soundEngine.speakSystem(`System Active. Mode: ${state.mode}. Battery ${Math.round(batteryLevel * 100)} percent.`);
    } else {
        soundEngine.speakSystem("System Idle. Double tap to connect.");
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
            videoStream={videoStream} 
            onExitGuardian={() => dispatch({ type: 'SET_MODE', payload: AppMode.IDLE })}
         />
      </main>

      {/* Floating Hints */}
      {state.mode !== AppMode.GUARDIAN && !isConnected && !privacyMode && (
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