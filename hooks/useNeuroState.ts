
import { useReducer, useEffect, useRef } from 'react';
import { NeuroState, ActionType, EnvironmentalEvent, AppMode, VisualFilter } from '../types';
import { memoryStore } from '../utils/memoryStore';

const initialState: NeuroState = {
  mode: AppMode.IDLE,
  visualFilter: 'NONE',
  guardianData: { active: false, transcript: [], eventLog: [], locationHistory: [] },
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
      // Note: We don't write to DB here to avoid blocking reducer. 
      // The DB write happens in the tool handler in App.tsx
      return {
          ...state,
          guardianData: {
              ...state.guardianData,
              eventLog: [newEvent, ...state.guardianData.eventLog]
          }
      };
    case 'LOAD_HISTORY':
      return {
          ...state,
          guardianData: {
              ...state.guardianData,
              eventLog: [...action.payload]
          }
      }
    case 'UPDATE_LOCATION':
      // Append new location to history if it has moved significantly (approx 5 meters)
      const lastLoc = state.guardianData.locationHistory[state.guardianData.locationHistory.length - 1];
      let newHistory = state.guardianData.locationHistory;
      
      if (!lastLoc || (Math.abs(lastLoc.lat - action.payload.lat) > 0.0001 || Math.abs(lastLoc.lng - action.payload.lng) > 0.0001)) {
          newHistory = [...newHistory, action.payload].slice(-100); // Keep last 100 points
      }

      return {
          ...state,
          guardianData: {
              ...state.guardianData,
              location: action.payload,
              locationHistory: newHistory
          }
      };
    case 'SET_STREAMING':
      return { ...state, isAudioStreaming: action.payload };
    case 'CYCLE_FILTER':
      const filters: VisualFilter[] = ['NONE', 'HIGH_CONTRAST', 'INVERTED', 'ACHROMATOPSIA'];
      const currentIndex = filters.indexOf(state.visualFilter);
      const nextIndex = (currentIndex + 1) % filters.length;
      return { ...state, visualFilter: filters[nextIndex] };
    default:
      return state;
  }
}

export const useNeuroState = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    
    // Create a ref that always holds current state for async callbacks (like Tool Calls)
    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    // Hydrate Memory Palace on Mount
    useEffect(() => {
        memoryStore.getRecentEvents(50)
            .then(events => {
                if (events && events.length > 0) {
                    dispatch({ type: 'LOAD_HISTORY', payload: events });
                }
            })
            .catch(err => console.error("Memory Palace hydration failed", err));
    }, []);

    return { state, dispatch, stateRef };
};
