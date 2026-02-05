import React, { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import { AppMode, NeuroState, ActionType, EnvironmentalEvent } from './types';
import { LiquidDisplay } from './components/LiquidDisplay';
import { BatteryWarning } from './components/BatteryWarning';
import { useLiveSession } from './hooks/useLiveSession';
import { useGeolocation } from './hooks/useGeolocation';
import { useBattery } from './hooks/useBattery';
import { useShake } from './hooks/useShake';
import { soundEngine } from './utils/soundEngine';
import { GestureLayer } from './components/GestureLayer';
import { Power, Activity, ShieldAlert, Settings, AlertOctagon, Sun, Moon, EyeOff } from 'lucide-react';

const loadMemory = (): EnvironmentalEvent[] => {
  try {
    const stored = localStorage.getItem('neurosync_memory');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const initialState: NeuroState = {
  mode: AppMode.IDLE,
  guardianData: { active: false, transcript: [], eventLog: loadMemory() },
  isAudioStreaming: false,
};

function reducer(state: NeuroState, action: ActionType): NeuroState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'UPDATE_NAV':
      return { ...state, mode: AppMode.NAVIGATION, navData: action.payload };
    case 'UPDATE_READ':
      return { ...state, mode: AppMode.READING, readData: action.payload };
    case 'UPDATE_SCAN':
      return { ...state, mode: AppMode.SCANNING, scanData: action.payload };
    case 'TRIGGER_DANGER':
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100, 200, 500, 200, 500, 200, 500, 200, 100, 50, 100, 50, 100]);
      return { 
        ...state, 
        mode: AppMode.DANGER, 
        navData: { 
            direction: state.navData?.direction || 'STOP', 
            distance: state.navData?.distance || '0m',
            hazard: action.payload 
        },
        guardianData: {
            ...state.guardianData,
            eventLog: [
                { id: Date.now().toString(), timestamp: Date.now(), type: 'HAZARD_DETECTED', description: action.payload, coordinates: state.guardianData.location },
                ...state.guardianData.eventLog
            ]
        }
      };
    case 'ACTIVATE_GUARDIAN':
       return { ...state, mode: AppMode.GUARDIAN, guardianData: { ...state.guardianData, active: true }};
    case 'UPDATE_PLAN':
       return { ...state, guardianData: { ...state.guardianData, plan: action.payload }};
    case 'ADD_TRANSCRIPT':
      return { 
        ...state, 
        guardianData: { 
           ...state.guardianData, 
           transcript: [...state.guardianData.transcript, action.payload] 
        } 
      };
    case 'LOG_EVENT':
      const baseLat = state.guardianData.location?.lat || 0;
      const baseLng = state.guardianData.location?.lng || 0;
      const jitter = () => (Math.random() - 0.5) * 0.0002; 
      const newEvent: EnvironmentalEvent = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          ...action.payload,
          coordinates: baseLat !== 0 ? { lat: baseLat + jitter(), lng: baseLng + jitter() } : undefined
      };
      return {
          ...state,
          guardianData: {
              ...state.guardianData,
              eventLog: [newEvent, ...state.guardianData.eventLog]
          }
      };
    case 'UPDATE_LOCATION':
      return {
          ...state,
          guardianData: {
              ...state.guardianData,
              location: action.payload
          }
      };
    case 'SET_STREAMING':
      return { ...state, isAudioStreaming: action.payload };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [showDebug, setShowDebug] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);
  
  const { location } = useGeolocation();
  const { level: batteryLevel, charging: isCharging, supported: batterySupported } = useBattery();
  
  // *** SHAKE TO RESET ***
  useShake(15, () => {
    if (state.mode !== AppMode.IDLE && state.mode !== AppMode.GUARDIAN) {
       soundEngine.playReset();
       soundEngine.speakSystem("Resetting interface.");
       if (navigator.vibrate) navigator.vibrate(200);
       dispatch({ type: 'SET_MODE', payload: AppMode.IDLE });
    }
  });

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isLightTheme ? '#FFFFFF' : '#000000');
    }
  }, [isLightTheme]);

  useEffect(() => {
     const timer = setTimeout(() => {
         soundEngine.speakSystem("NeuroSync Online. Double tap screen to connect. Swipe down with two fingers for privacy curtain.");
     }, 1000);
     return () => clearTimeout(timer);
  }, []);
  
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (location) {
        dispatch({ type: 'UPDATE_LOCATION', payload: location });
    }
  }, [location]);

  useEffect(() => {
    localStorage.setItem('neurosync_memory', JSON.stringify(state.guardianData.eventLog));
  }, [state.guardianData.eventLog]);

  const isLowBattery = batterySupported && !isCharging && batteryLevel <= 0.20;
  useEffect(() => {
    if (isLowBattery) {
        soundEngine.playBatteryLow();
        soundEngine.speakSystem("Warning. Battery critically low.");
    }
  }, [isLowBattery]);

  useEffect(() => {
    soundEngine.stopSonar();
    
    if (state.mode === AppMode.NAVIGATION) {
       const distStr = state.navData?.distance || "";
       const direction = state.navData?.direction;
       
       let intensity = 0.2;
       if (distStr.includes("1m") || distStr.includes("2m")) intensity = 0.9;
       
       if (direction === 'LEFT') {
         soundEngine.setPan(-0.8);
         if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
       } else if (direction === 'RIGHT') {
         soundEngine.setPan(0.8); 
         if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
       } else if (direction === 'STOP') {
         soundEngine.setPan(0);
         if (navigator.vibrate) navigator.vibrate([500]);
       } else {
         soundEngine.setPan(0);
       }

       soundEngine.startSonar(intensity);
    } 
    else if (state.mode === AppMode.DANGER) {
       soundEngine.playDangerAlarm();
       soundEngine.speakSystem("DANGER. STOP.");
    }
    else if (state.mode === AppMode.SCANNING) {
       soundEngine.playSuccess();
    }
    else if (state.mode !== AppMode.IDLE && state.mode !== AppMode.GUARDIAN) {
       soundEngine.playModeSwitch();
    }
  }, [state.mode, state.navData?.distance, state.navData?.direction]);
  
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
      const memories = stateRef.current.guardianData.eventLog.filter(e => 
        e.description.toLowerCase().includes(query) || 
        e.type.toLowerCase().includes(query)
      );
      return { found: memories.length > 0, memories: memories.slice(0, 5) };
    }
    return { status: "unknown_tool" };
  }, []);

  const { connect, disconnect, isConnected, videoStream, error, getSnapshot } = useLiveSession({
    onToolCall: handleToolCall,
    onTranscript: handleTranscript,
    apiKey,
    mode: state.mode,
    location // *** PASS LOCATION FOR CONTEXT INJECTION ***
  });

  useEffect(() => {
    if (error) {
        soundEngine.speakSystem(`System Error: ${error}`);
    }
  }, [error]);

  useEffect(() => {
      getSnapshotRef.current = getSnapshot;
  }, [getSnapshot]);

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

      {state.mode !== AppMode.GUARDIAN && !privacyMode && (
        <div className="absolute top-0 left-0 w-full p-2 pt-safe z-[40] flex justify-between pointer-events-none items-start">
           <div 
              className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 rounded-xl border-4 ${isConnected ? 'border-[#FFD600] bg-black text-[#FFD600]' : 'border-gray-600 bg-neuro-ui text-gray-400'} mt-2 ml-2 transition-all duration-300`}
              role="status"
              aria-live="polite"
           >
              <Activity className={`${isConnected ? 'animate-pulse' : ''}`} size={20} strokeWidth={4} />
              <span className="font-bold text-base md:text-lg tracking-wider">
                  {isConnected ? 'LIVE' : 'OFF'}
              </span>
           </div>
           
           <div className="flex items-center gap-2 mt-2 mr-2">
               <button 
                onClick={() => dispatch({ type: 'ACTIVATE_GUARDIAN' })}
                className="pointer-events-auto bg-[#FF4D00] text-white border-4 border-white px-3 py-2 rounded-xl font-black text-sm md:text-base animate-pulse hover:bg-red-600 active:scale-95 shadow-xl flex items-center gap-2 transition-transform"
                aria-label="Emergency Help"
               >
                 <ShieldAlert size={20} strokeWidth={4} /> HELP
               </button>
           </div>
        </div>
      )}

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

      <div className="fixed top-32 right-4 z-[60]">
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className="bg-neuro-ui p-3 rounded-full text-gray-500 hover:text-neuro-text border-2 border-gray-700 backdrop-blur-sm pointer-events-auto"
            aria-label="Open Debug Menu"
          >
            <Settings size={24} strokeWidth={3} />
          </button>
      </div>

      {showDebug && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-4 border-black p-4 text-sm shadow-2xl text-black font-bold rounded-xl overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                <h3 className="uppercase text-xl">Simulator</h3>
                <button onClick={() => setShowDebug(false)} className="bg-black text-white p-2 rounded">CLOSE</button>
            </div>
            
            <div className="mb-6 flex justify-between items-center bg-gray-100 p-3 rounded border-2 border-black">
                <div className="flex items-center gap-2">
                   {isLightTheme ? <Sun size={20} /> : <Moon size={20} />}
                   <span>Theme: {isLightTheme ? 'Light' : 'Dark'}</span>
                </div>
                <button 
                    onClick={() => {
                        setIsLightTheme(!isLightTheme);
                        soundEngine.playModeSwitch();
                    }} 
                    className="bg-black text-white px-3 py-1 rounded uppercase text-xs"
                >
                    Toggle
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
               <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'STRAIGHT', distance: '10m' }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">FWD</button>
               <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'LEFT', distance: 'Turn' }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">LEFT</button>
               <button onClick={() => dispatch({ type: 'UPDATE_READ', payload: { text: "Latte $4.00" }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">READ</button>
               <button onClick={() => dispatch({ type: 'UPDATE_SCAN', payload: { objectName: "Soup Can", details: "Tomato" }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">SCAN</button>
               <button onClick={() => dispatch({ type: 'TRIGGER_DANGER', payload: "Car Backing Up!" })} className="col-span-2 bg-[#FF4D00] text-white p-3 border-2 border-black font-black uppercase rounded">! DANGER !</button>
            </div>

            <div className="border-t-4 border-black pt-3">
              <label className="block mb-1 font-bold">API_KEY</label>
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                className="w-full bg-gray-100 border-2 border-black p-3 text-black font-mono rounded"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;