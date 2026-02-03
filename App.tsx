import React, { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import { AppMode, NeuroState, ActionType, EnvironmentalEvent } from './types';
import { LiquidDisplay } from './components/LiquidDisplay';
import { useLiveSession } from './hooks/useLiveSession';
import { useGeolocation } from './hooks/useGeolocation';
import { soundEngine } from './utils/soundEngine';
import { Power, Activity, ShieldAlert, Settings } from 'lucide-react';

// --- State Management ---
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
      if (navigator.vibrate) navigator.vibrate([500, 100, 500]);
      return { 
        ...state, 
        mode: AppMode.DANGER, 
        navData: { ...state.navData!, hazard: action.payload },
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
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [showDebug, setShowDebug] = useState(false);
  const { location } = useGeolocation();
  
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

  useEffect(() => {
    soundEngine.stopSonar();
    if (state.mode === AppMode.NAVIGATION) {
       const distStr = state.navData?.distance || "";
       let intensity = 0.2;
       if (distStr.includes("1m") || distStr.includes("2m")) intensity = 0.9;
       if (distStr.includes("5m")) intensity = 0.5;
       soundEngine.startSonar(intensity);
    } 
    else if (state.mode === AppMode.DANGER) {
       soundEngine.playDangerAlarm();
    }
    else if (state.mode === AppMode.SCANNING) {
       soundEngine.playSuccess();
    }
    else if (state.mode !== AppMode.IDLE) {
       soundEngine.playModeSwitch();
    }
  }, [state.mode, state.navData?.distance, state.navData?.hazard]);

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
      return { success: true };
    } 
    else if (name === 'logEnvironmentalEvent') {
      dispatch({ type: 'LOG_EVENT', payload: { type: args.type, description: args.description } });
      return { success: true, message: "Event logged to memory." };
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

  const handleTranscript = (text: string) => {};

  const { connect, disconnect, isConnected } = useLiveSession({
    onToolCall: handleToolCall,
    onTranscript: handleTranscript
  });

  const toggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      if (!process.env.API_KEY && !apiKey) {
        alert("Please set API_KEY in env or use the debug panel.");
        return;
      }
      if (!process.env.API_KEY && apiKey) {
        process.env.API_KEY = apiKey;
      }
      soundEngine.playModeSwitch();
      connect();
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col font-sans relative">
      
      {/* 
        ACCESSIBILITY HEADER 
        High contrast status indicators.
      */}
      <div className="absolute top-0 left-0 w-full p-4 z-50 flex justify-between pointer-events-none">
         <div className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl border-4 ${isConnected ? 'border-[#FFD600] bg-black text-[#FFD600]' : 'border-gray-600 bg-gray-900 text-gray-400'}`}>
            <Activity className={`${isConnected ? 'animate-pulse' : ''}`} size={24} strokeWidth={4} />
            <span className="font-bold text-lg tracking-wider" aria-live="polite">
                {isConnected ? 'LIVE' : 'OFF'}
            </span>
         </div>
         
         <button 
           onClick={() => dispatch({ type: 'ACTIVATE_GUARDIAN' })}
           className="pointer-events-auto bg-[#FF4D00] text-white border-4 border-white px-6 py-3 rounded-xl font-black text-xl animate-pulse hover:bg-red-600 active:scale-95 shadow-xl flex items-center gap-2"
           aria-label="Emergency Help"
         >
           <ShieldAlert size={28} strokeWidth={4} /> HELP
         </button>
      </div>

      {/* 
        MAIN CONTENT AREA
        This is the "Liquid Interface".
      */}
      <main className="flex-1 relative z-0" role="main" aria-live="assertive">
         <LiquidDisplay state={state} />
      </main>

      {/* 
        BOTTOM CONTROLS 
        Anchored to bottom center. Massive touch target.
      */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-full pointer-events-none">
           <button 
             onClick={toggleConnection}
             className={`pointer-events-auto w-32 h-32 rounded-full flex items-center justify-center border-[8px] transition-all duration-200 active:scale-90 ${
                isConnected 
                ? 'border-white bg-[#FFD600] text-black shadow-[0_0_50px_rgba(255,214,0,0.8)]' 
                : 'border-gray-500 bg-gray-800 text-gray-400'
             }`}
             aria-label={isConnected ? "Stop NeuroSync" : "Start NeuroSync"}
             title={isConnected ? "Stop" : "Start"}
           >
             <Power size={56} strokeWidth={4} />
           </button>
      </div>

      {/* 
        DEBUG PANEL TRIGGER
        Hidden in corner, small touch target to avoid accidental hits.
      */}
      <div className="fixed top-24 right-4 z-[60]">
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className="bg-black/50 p-3 rounded-full text-gray-500 hover:text-white border-2 border-gray-700"
            aria-label="Open Debug Menu"
          >
            <Settings size={24} strokeWidth={3} />
          </button>
      </div>

      {showDebug && (
        <div className="fixed top-24 right-16 w-72 bg-white border-4 border-black p-4 text-sm z-[60] shadow-2xl text-black font-bold">
          <h3 className="mb-4 uppercase border-b-4 border-black pb-2 text-xl">Simulator</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
             <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'STRAIGHT', distance: '10m' }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold">FWD</button>
             <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'LEFT', distance: 'Turn' }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold">LEFT</button>
             <button onClick={() => dispatch({ type: 'UPDATE_READ', payload: { text: "Latte $4.00" }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold">READ</button>
             <button onClick={() => dispatch({ type: 'UPDATE_SCAN', payload: { objectName: "Soup Can", details: "Tomato" }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold">SCAN</button>
             <button onClick={() => dispatch({ type: 'TRIGGER_DANGER', payload: "Car Backing Up!" })} className="col-span-2 bg-[#FF4D00] text-white p-3 border-2 border-black font-black uppercase">! DANGER !</button>
             <button onClick={() => dispatch({ type: 'LOG_EVENT', payload: { type: 'OBJECT_SEEN', description: "Keys on table" }})} className="col-span-2 bg-[#0047AB] text-white p-3 border-2 border-black font-bold">LOG MEMORY</button>
          </div>

          <div className="border-t-4 border-black pt-3">
            <label className="block mb-1 font-bold">API_KEY</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              className="w-full bg-gray-100 border-2 border-black p-3 text-black font-mono"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default App;