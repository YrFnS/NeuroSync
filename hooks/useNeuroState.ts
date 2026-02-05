import { useReducer, useEffect, useRef } from 'react';
import { NeuroState, ActionType, EnvironmentalEvent, AppMode } from '../types';

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

export const useNeuroState = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    
    // Create a ref that always holds current state for async callbacks (like Tool Calls)
    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    // Persist memory
    useEffect(() => {
        localStorage.setItem('neurosync_memory', JSON.stringify(state.guardianData.eventLog));
    }, [state.guardianData.eventLog]);

    return { state, dispatch, stateRef };
};