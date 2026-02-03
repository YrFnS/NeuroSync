import React, { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import { AppMode, NeuroState, ActionType, EnvironmentalEvent } from './types';
import { LiquidDisplay } from './components/LiquidDisplay';
import { useLiveSession } from './hooks/useLiveSession';
import { useGeolocation } from './hooks/useGeolocation';
import { soundEngine } from './utils/soundEngine';
import { Power, Activity, ShieldAlert, Settings, AlertOctagon } from 'lucide-react';

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
      // Haptic Pattern: SOS (Short Short Short, Long Long Long, Short Short Short)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100, 200, 500, 200, 500, 200, 500, 200, 100, 50, 100, 50, 100]);
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

  // Sound & Haptics Engine Control
  useEffect(() => {
    soundEngine.stopSonar();
    
    if (state.mode === AppMode.NAVIGATION) {
       const distStr = state.navData?.distance || "";
       const direction = state.navData?.direction;
       
       // Calculate intensity for sonar speed
       let intensity = 0.2;
       if (distStr.includes("1m") || distStr.includes("2m")) intensity = 0.9;
       
       // SPATIAL AUDIO MAPPING
       if (direction === 'LEFT') {
         soundEngine.setPan(-0.8); // Pan Left
         if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Haptic: Double tap
       } else if (direction === 'RIGHT') {
         soundEngine.setPan(0.8); // Pan Right
         if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Haptic: Double tap
       } else if (direction === 'STOP') {
         soundEngine.setPan(0);
         if (navigator.vibrate) navigator.vibrate([500]); // Haptic: Long buzz
       } else {
         soundEngine.setPan(0); // Straight/Center
       }

       soundEngine.startSonar(intensity);
    } 
    else if (state.mode === AppMode.DANGER) {
       soundEngine.playDangerAlarm();
    }
    else if (state.mode === AppMode.SCANNING) {
       soundEngine.playSuccess();
    }
    else if (state.mode !== AppMode.IDLE && state.mode !== AppMode.GUARDIAN) {
       soundEngine.playModeSwitch();
    }
  }, [state.mode, state.navData?.distance, state.navData?.direction]);
  
  const handleTranscript = (text: string) => {};

  // Tool Call Handler
  // We need access to getSnapshot from the hook, but hooks can't be called inside callback directly if it wasn't returned yet.
  // We will pass the handler to useLiveSession, but useLiveSession returns getSnapshot.
  // Solution: Use a ref to store getSnapshot when it becomes available.
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
      return { success: true };
    } 
    else if (name === 'provideEmergencyPlan') {
      dispatch({ type: 'UPDATE_PLAN', payload: args });
      return { success: true };
    }
    else if (name === 'logEnvironmentalEvent') {
      // CAPTURE SNAPSHOT OF THE MEMORY
      const snapshot = getSnapshotRef.current();
      dispatch({ type: 'LOG_EVENT', payload: { type: args.type, description: args.description, snapshot } });
      soundEngine.playSuccess(); // Audio confirmation
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
    onTranscript: handleTranscript
  });

  // Keep ref updated
  useEffect(() => {
      getSnapshotRef.current = getSnapshot;
  }, [getSnapshot]);

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
    <div className="h-[100dvh] w-screen bg-black text-white overflow-hidden flex flex-col font-sans relative">
      
      {/* Header - Safe Area Top */}
      <div className="absolute top-0 left-0 w-full p-2 pt-safe z-50 flex justify-between pointer-events-none items-start">
         <div className={`pointer-events-auto flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 rounded-xl border-4 ${isConnected ? 'border-[#FFD600] bg-black text-[#FFD600]' : 'border-gray-600 bg-gray-900 text-gray-400'} mt-2 ml-2`}>
            <Activity className={`${isConnected ? 'animate-pulse' : ''}`} size={20} strokeWidth={4} />
            <span className="font-bold text-base md:text-lg tracking-wider" aria-live="polite">
                {isConnected ? 'LIVE' : 'OFF'}
            </span>
         </div>
         
         <button 
           onClick={() => dispatch({ type: 'ACTIVATE_GUARDIAN' })}
           className="pointer-events-auto bg-[#FF4D00] text-white border-4 border-white px-4 py-2 md:px-6 md:py-3 rounded-xl font-black text-lg md:text-xl animate-pulse hover:bg-red-600 active:scale-95 shadow-xl flex items-center gap-2 mt-2 mr-2"
           aria-label="Emergency Help"
         >
           <ShieldAlert size={24} strokeWidth={4} /> HELP
         </button>
      </div>

      {/* Permission Error Banner */}
      {error && (
         <div className="absolute top-24 left-4 right-4 z-50 bg-[#FF4D00] text-white p-4 rounded-xl border-4 border-white flex items-center gap-4 animate-bounce">
            <AlertOctagon size={48} strokeWidth={3} />
            <div>
               <h2 className="text-2xl font-black uppercase">System Error</h2>
               <p className="font-bold">{error}</p>
            </div>
         </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative z-0 h-full w-full" role="main" aria-live="assertive">
         <LiquidDisplay 
            state={state} 
            videoStream={videoStream} 
            onExitGuardian={() => dispatch({ type: 'SET_MODE', payload: AppMode.IDLE })}
         />
      </main>

      {/* Bottom Controls - Safe Area Bottom */}
      {state.mode !== AppMode.GUARDIAN && (
        <div className="absolute bottom-6 pb-safe left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-full pointer-events-none">
             <button 
               onClick={toggleConnection}
               className={`pointer-events-auto w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center border-[6px] md:border-[8px] transition-all duration-200 active:scale-90 ${
                  isConnected 
                  ? 'border-white bg-[#FFD600] text-black shadow-[0_0_50px_rgba(255,214,0,0.8)]' 
                  : 'border-gray-500 bg-gray-800 text-gray-400'
               }`}
               aria-label={isConnected ? "Stop NeuroSync" : "Start NeuroSync"}
               title={isConnected ? "Stop" : "Start"}
             >
               <Power size={40} className="md:w-14 md:h-14" strokeWidth={4} />
             </button>
        </div>
      )}

      {/* Debug Trigger */}
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
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-4 border-black p-4 text-sm shadow-2xl text-black font-bold rounded-xl overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                <h3 className="uppercase text-xl">Simulator</h3>
                <button onClick={() => setShowDebug(false)} className="bg-black text-white p-2 rounded">CLOSE</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
               <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'STRAIGHT', distance: '10m' }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">FWD</button>
               <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'LEFT', distance: 'Turn' }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">LEFT</button>
               <button onClick={() => dispatch({ type: 'UPDATE_READ', payload: { text: "Latte $4.00" }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">READ</button>
               <button onClick={() => dispatch({ type: 'UPDATE_SCAN', payload: { objectName: "Soup Can", details: "Tomato" }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">SCAN</button>
               <button onClick={() => dispatch({ type: 'TRIGGER_DANGER', payload: "Car Backing Up!" })} className="col-span-2 bg-[#FF4D00] text-white p-3 border-2 border-black font-black uppercase rounded">! DANGER !</button>
               <button onClick={() => dispatch({ type: 'UPDATE_PLAN', payload: { safeExitRoute: "Turn around, walk 10m to exit.", nearestLandmark: "Red Fire Hydrant", hazardSummary: "Slippery Floor", recommendedAction: "Exit Immediately" }})} className="col-span-2 bg-[#0047AB] text-white p-3 border-2 border-black font-bold rounded">GENERATE PLAN</button>
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