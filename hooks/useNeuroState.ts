
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
      
      const hazardEvent: EnvironmentalEvent = { 
          id: Date.now().toString(), 
          timestamp: Date.now(), 
          type: 'HAZARD_DETECTED', 
          description: action.payload, 
          coordinates: state.guardianData.location 
      };

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
                hazardEvent,
                ...state.guardianData.eventLog
            ].slice(0, 20) // Limit to last 20 items to prevent state bloat
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
           // Keep only last 30 lines to avoid massive DOM rendering in transcript component
           transcript: [...state.guardianData.transcript, action.payload].slice(-30) 
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
          // Explicitly strip snapshot if it somehow passed through to avoid state bloat
          snapshot: undefined, 
          coordinates: baseLat !== 0 ? { lat: baseLat + jitter(), lng: baseLng + jitter() } : undefined
      };
      return {
          ...state,
          guardianData: {
              ...state.guardianData,
              eventLog: [newEvent, ...state.guardianData.eventLog].slice(0, 20)
          }
      };
    case 'LOAD_HISTORY':
      // When loading history, we take lightweight versions (without snapshots) if possible, 
      // but for now we just slice to keep it fast.
      return {
          ...state,
          guardianData: {
              ...state.guardianData,
              eventLog: [...action.payload].slice(0, 20)
          }
      }
    case 'UPDATE_LOCATION':
      // Append new location to history if it has moved significantly (approx 5 meters)
      const lastLoc = state.guardianData.locationHistory[state.guardianData.locationHistory.length - 1];
      let newHistory = state.guardianData.locationHistory;
      
      if (!lastLoc || (Math.abs(lastLoc.lat - action.payload.lat) > 0.0001 || Math.abs(lastLoc.lng - action.payload.lng) > 0.0001)) {
          newHistory = [...newHistory, action.payload].slice(-50); // Reduced history limit from 100 to 50
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
    
    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    // Hydrate Memory Palace on Mount - Only get last 10 to start fast
    useEffect(() => {
        memoryStore.getRecentEvents(10)
            .then(events => {
                if (events && events.length > 0) {
                    dispatch({ type: 'LOAD_HISTORY', payload: events });
                }
            })
            .catch(err => console.error("Memory Palace hydration failed", err));
    }, []);

    return { state, dispatch, stateRef };
};
