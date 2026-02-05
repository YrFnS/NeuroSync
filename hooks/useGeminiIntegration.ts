
import { useCallback, useRef, useEffect } from 'react';
import { AppMode, NeuroState, ActionType } from '../types';
import { useLiveSession } from './useLiveSession';
import { soundEngine } from '../utils/soundEngine';
import { memoryStore } from '../utils/memoryStore';

export const useGeminiIntegration = (
    state: NeuroState,
    dispatch: React.Dispatch<ActionType>,
    stateRef: React.MutableRefObject<NeuroState>,
    apiKey: string,
    location: any,
    cameraStream: MediaStream | null
) => {
    // We use a ref to hold the getSnapshot function to avoid circular dependencies in Tool Calls
    const getSnapshotRef = useRef<() => string | undefined>(() => undefined);

    const handleTranscript = useCallback((text: string, isUser: boolean) => {
        const prefix = isUser ? "USER: " : "AI: ";
        dispatch({ type: 'ADD_TRANSCRIPT', payload: `${prefix}${text}` });
    }, [dispatch]);
  
    const handleToolCall = useCallback(async (name: string, args: any) => {
      // Log tool use for debugging
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
        
        // PERFORMANCE: Auto-log danger to memory (Async), but DON'T clog React state with Base64
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
        
        // 1. Dispatch to UI state for immediate feedback (WITHOUT snapshot to save memory)
        dispatch({ type: 'LOG_EVENT', payload: { type: args.type, description: args.description } });
        soundEngine.playSuccess();
        
        // 2. Persist to Memory Palace with full evidence
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
  
        return { success: true, message: "Event logged to memory." };
      } 
      else if (name === 'queryMemory') {
        const query = args.query.toLowerCase();
        // Search persistent store
        const memories = await memoryStore.searchMemories(query);
        return { found: memories.length > 0, memories: memories.slice(0, 5) };
      }
      return { status: "unknown_tool" };
    }, [dispatch, stateRef]);

    const session = useLiveSession({
        onToolCall: handleToolCall,
        onTranscript: handleTranscript,
        apiKey,
        mode: state.mode,
        location,
        videoStream: cameraStream
    });

    useEffect(() => {
        getSnapshotRef.current = session.getSnapshot;
    }, [session.getSnapshot]);

    return session;
};
