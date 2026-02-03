import React, { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import { AppMode, NeuroState, ActionType, EnvironmentalEvent } from './types';
import { LiquidDisplay } from './components/LiquidDisplay';
import { useLiveSession } from './hooks/useLiveSession';
import { useGeolocation } from './hooks/useGeolocation';
import { Mic, MicOff, Power, Share2, Activity, Play, Square, AlertOctagon, Radio } from 'lucide-react';

// --- State Management ---
// Initialize state from localStorage if available
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
      // Generate a coordinate near the user if location is known, or default to 0,0
      const baseLat = state.guardianData.location?.lat || 0;
      const baseLng = state.guardianData.location?.lng || 0;
      // Add slight jitter to simulate precise object location nearby
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
  
  // Ref to access current state inside callbacks without triggering re-renders of the hook
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Sync Location to State
  useEffect(() => {
    if (location) {
        dispatch({ type: 'UPDATE_LOCATION', payload: location });
    }
  }, [location]);

  // Persist Memory
  useEffect(() => {
    localStorage.setItem('neurosync_memory', JSON.stringify(state.guardianData.eventLog));
  }, [state.guardianData.eventLog]);

  // --- Tool Callbacks ---
  const handleToolCall = useCallback(async (name: string, args: any) => {
    console.log("Tool Called:", name, args);
    
    // Don't log internal queries to transcript to keep it clean, or do it for debugging
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
      
      return { 
        found: memories.length > 0, 
        memories: memories.slice(0, 5) 
      };
    }
    
    return { status: "unknown_tool" };
  }, []);

  const handleTranscript = (text: string) => {
    // In a real app, we'd get transcript chunks from the Live API
  };

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
      connect();
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col font-sans relative">
      
      {/* Top Floating Status Bar */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3 animate-in slide-in-from-top duration-500">
         <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isConnected ? 'border-green-500/50 bg-green-500/10' : 'border-gray-700 bg-gray-800/50'} backdrop-blur-md`}>
            <Activity className={`${isConnected ? 'text-green-500 animate-pulse' : 'text-gray-500'}`} size={14} />
            <span className={`font-mono text-[10px] tracking-widest ${isConnected ? 'text-green-500' : 'text-gray-500'}`}>
                {isConnected ? 'LIVE_LINK_ACTIVE' : 'OFFLINE'}
            </span>
         </div>
      </div>

      {/* SOS Button (Top Right) */}
      <button 
           onClick={() => dispatch({ type: 'ACTIVATE_GUARDIAN' })}
           className="absolute top-4 right-4 z-50 bg-red-600/20 text-red-500 border border-red-500 px-4 py-2 rounded-none skew-x-[-10deg] text-xs font-black animate-pulse hover:bg-red-600 hover:text-white transition-colors"
      >
           <span className="skew-x-[10deg] block tracking-widest">SOS // PANIC</span>
      </button>

      {/* Main Liquid Interface */}
      <main className="flex-1 relative z-0">
         <LiquidDisplay state={state} />
      </main>

      {/* Bottom Floating Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 pointer-events-none">
           {/* Main Power Button */}
           <button 
             onClick={toggleConnection}
             className={`pointer-events-auto w-24 h-24 rounded-full flex items-center justify-center border-[6px] transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)] active:scale-90 ${
                isConnected 
                ? 'border-[#00FF94] bg-[#00FF94]/10 shadow-[0_0_40px_rgba(0,255,148,0.4)]' 
                : 'border-white/10 bg-white/5 hover:border-white/30'
             }`}
           >
             <Power size={36} className={`${isConnected ? "text-[#00FF94]" : "text-white/30"}`} />
           </button>
      </div>

      {/* DEBUG / SIMULATOR PANEL */}
      <div className="fixed top-20 right-4 z-[60]">
          <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest">
            {showDebug ? '[ - ]' : '[ + ] SIM'}
          </button>
      </div>

      {showDebug && (
        <div className="fixed top-28 right-4 w-64 bg-black/90 backdrop-blur-xl border border-gray-800 p-4 rounded-none text-xs z-[60] shadow-2xl font-mono">
          <h3 className="font-bold mb-4 text-white border-b border-gray-800 pb-2">DEV_OVERRIDE</h3>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
             <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'STRAIGHT', distance: '10m' }})} className="bg-slate-800 p-2 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors">NAV: FWD</button>
             <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'LEFT', distance: 'Turn Now' }})} className="bg-slate-800 p-2 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors">NAV: LEFT</button>
             <button onClick={() => dispatch({ type: 'UPDATE_READ', payload: { text: "MENU: 1. Latte $4  2. Espresso $3" }})} className="bg-slate-800 p-2 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors">READ</button>
             <button onClick={() => dispatch({ type: 'UPDATE_SCAN', payload: { objectName: "Campbell's Soup", details: "Tomato, 10oz can" }})} className="bg-slate-800 p-2 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors">SCAN</button>
             <button onClick={() => dispatch({ type: 'TRIGGER_DANGER', payload: "Open Manhole Ahead" })} className="col-span-2 bg-red-900/20 border border-red-900 text-red-500 p-2 hover:bg-red-900/40 transition-colors">! DANGER !</button>
             <button onClick={() => dispatch({ type: 'LOG_EVENT', payload: { type: 'OBJECT_SEEN', description: "Keys placed on table" }})} className="col-span-2 bg-blue-900/20 border border-blue-900 text-blue-500 p-2 hover:bg-blue-900/40 transition-colors">LOG MEMORY</button>
          </div>

          <div className="border-t border-gray-800 pt-2">
            <label className="block text-gray-600 mb-1">API_KEY</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              className="w-full bg-black border border-gray-800 rounded-none p-2 text-white focus:border-white outline-none"
              placeholder="sk-..."
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default App;