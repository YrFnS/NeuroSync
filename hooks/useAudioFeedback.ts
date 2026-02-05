import { useEffect } from 'react';
import { AppMode, NeuroState } from '../types';
import { soundEngine } from '../utils/soundEngine';

export const useAudioFeedback = (state: NeuroState) => {
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
};