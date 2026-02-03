import React, { useReducer, useState, useCallback, useEffect } from 'react';
import { AppMode, NeuroState, ActionType, EnvironmentalEvent } from './types';
import { LiquidDisplay } from './components/LiquidDisplay';
import { useLiveSession } from './hooks/useLiveSession';
import { Mic, MicOff, Power, Share2, Activity, Play, Square, AlertOctagon } from 'lucide-react';

// --- State Management ---
const initialState: NeuroState = {
  mode: AppMode.IDLE,
  guardianData: { active: false, transcript: [], eventLog: [] },
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
      // Haptic feedback logic here if supported
      if (navigator.vibrate) navigator.vibrate([500, 100, 500]);
      return { 
        ...state, 
        mode: AppMode.DANGER, 
        navData: { ...state.navData!, hazard: action.payload },
        guardianData: {
            ...state.guardianData,
            eventLog: [
                { id: Date.now().toString(), timestamp: Date.now(), type: 'HAZARD_DETECTED', description: action.payload },
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
      const newEvent: EnvironmentalEvent = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          ...action.payload,
          coordinates: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 } // Simulating map placement
      };
      return {
          ...state,
          guardianData: {
              ...state.guardianData,
              eventLog: [newEvent, ...state.guardianData.eventLog]
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

  // --- Tool Callbacks ---
  const handleToolCall = useCallback(async (name: string, args: any) => {
    console.log("Tool Called:", name, args);
    
    // Log intent to guardian transcript
    if (name !== 'logEnvironmentalEvent') {
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
    } else if (name === 'triggerDanger') {
      dispatch({ type: 'TRIGGER_DANGER', payload: args.hazardDescription });
    } else if (name === 'activateGuardian') {
      dispatch({ type: 'ACTIVATE_GUARDIAN' });
    } else if (name === 'logEnvironmentalEvent') {
      dispatch({ type: 'LOG_EVENT', payload: { type: args.type, description: args.description } });
    }
    return { status: "success" };
  }, []);

  const handleTranscript = (text: string) => {
    // In a real app, we'd get transcript chunks from the Live API
    // For now, we simulate this based on tools
  };

  const { connect, disconnect, isConnected, isStreaming } = useLiveSession({
    onToolCall: handleToolCall,
    onTranscript: handleTranscript
  });

  const toggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      // Small trick to allow user to input key if not in env
      if (!process.env.API_KEY && !apiKey) {
        alert("Please set API_KEY in env or use the debug panel.");
        return;
      }
      // Inject key for hook if missing in process.env (Simulator mode support)
      if (!process.env.API_KEY && apiKey) {
        process.env.API_KEY = apiKey;
      }
      connect();
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col font-sans">
      
      {/* Top Bar (Sticky) */}
      <header className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
         <div className="flex items-center gap-2">
            <Activity className={`text-${isConnected ? 'green' : 'gray'}-500`} size={20} />
            <span className="font-mono font-bold tracking-widest text-sm">NEUROSYNC v1.0</span>
         </div>
         <button 
           onClick={() => dispatch({ type: 'ACTIVATE_GUARDIAN' })}
           className="bg-red-500/20 text-red-500 border border-red-500 px-3 py-1 rounded-full text-xs font-bold animate-pulse hover:bg-red-500 hover:text-white transition-colors"
         >
           SOS
         </button>
      </header>

      {/* Main Liquid Interface */}
      <main className="flex-1 relative">
         <LiquidDisplay state={state} />
      </main>

      {/* Bottom Controls */}
      <footer className="absolute bottom-0 left-0 w-full p-6 pb-10 flex justify-center items-end bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-6">
           {/* Connection Toggle */}
           <button 
             onClick={toggleConnection}
             className={`w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-2xl ${isConnected ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-800'}`}
           >
             <Power size={32} className={isConnected ? "text-green-500 shadow-green-500 drop-shadow-lg" : "text-gray-400"} />
           </button>
        </div>
      </footer>

      {/* DEBUG / SIMULATOR PANEL (Hidden by default, toggleable) */}
      <div className="fixed top-20 right-4 z-50">
          <button onClick={() => setShowDebug(!showDebug)} className="text-xs text-gray-700 bg-gray-900 p-1 border border-gray-800 rounded">
            {showDebug ? 'Hide Sim' : 'Simulate'}
          </button>
      </div>

      {showDebug && (
        <div className="fixed top-28 right-4 w-64 bg-gray-900/90 backdrop-blur border border-gray-700 p-4 rounded-xl text-xs z-50 shadow-2xl">
          <h3 className="font-bold mb-2 text-white">NeuroSync Simulator</h3>
          <p className="mb-2 text-gray-400">Force Gemini states without API cost.</p>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
             <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'STRAIGHT', distance: '10m' }})} className="bg-slate-700 p-2 rounded text-white hover:bg-slate-600">Nav: Straight</button>
             <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'LEFT', distance: 'Turn Now' }})} className="bg-slate-700 p-2 rounded text-white hover:bg-slate-600">Nav: Left</button>
             <button onClick={() => dispatch({ type: 'UPDATE_READ', payload: { text: "MENU: 1. Latte $4  2. Espresso $3" }})} className="bg-slate-700 p-2 rounded text-white hover:bg-slate-600">Read Mode</button>
             <button onClick={() => dispatch({ type: 'UPDATE_SCAN', payload: { objectName: "Campbell's Soup", details: "Tomato, 10oz can" }})} className="bg-slate-700 p-2 rounded text-white hover:bg-slate-600">Scan Object</button>
             <button onClick={() => dispatch({ type: 'TRIGGER_DANGER', payload: "Open Manhole Ahead" })} className="col-span-2 bg-red-900/50 border border-red-500 text-red-200 p-2 rounded hover:bg-red-800">Trigger Danger</button>
             <button onClick={() => dispatch({ type: 'LOG_EVENT', payload: { type: 'OBJECT_SEEN', description: "Keys placed on table" }})} className="col-span-2 bg-blue-900/50 border border-blue-500 text-blue-200 p-2 rounded hover:bg-blue-800">Sim Memory: Keys</button>
          </div>

          <div className="border-t border-gray-700 pt-2">
            <label className="block text-gray-500 mb-1">API Key Override</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              className="w-full bg-black border border-gray-600 rounded p-1 text-white"
              placeholder="sk-..."
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
