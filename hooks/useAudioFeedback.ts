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
           
           // Spatial Audio Mapping
           // 0 = Straight, -90 = Left, 90 = Right
           if (direction === 'LEFT') {
             soundEngine.setAzimuth(-90, 2); // Source is 2m to the left
             if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
           } else if (direction === 'RIGHT') {
             soundEngine.setAzimuth(90, 2); // Source is 2m to the right
             if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
           } else if (direction === 'STOP') {
             soundEngine.setAzimuth(0, 0.5); // Source is inside head/very close
             if (navigator.vibrate) navigator.vibrate([500]);
           } else {
             // STRAIGHT or CROSSWALK
             soundEngine.setAzimuth(0, 3); // Source is 3m ahead
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