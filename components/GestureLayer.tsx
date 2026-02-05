import React, { useRef, useState, useEffect } from 'react';
import { EyeOff, Eye } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface Props {
  onDoubleTap: () => void;
  onLongPress: () => void;
  onSingleTap: () => void;
  isConnected: boolean;
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
}

export const GestureLayer: React.FC<Props> = ({ 
  onDoubleTap, 
  onLongPress, 
  onSingleTap,
  isConnected,
  privacyMode,
  setPrivacyMode 
}) => {
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchEndY, setTouchEndY] = useState<number>(0);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const longPressTriggered = useRef<boolean>(false);
  const doubleTapTimer = useRef<number | null>(null);
  const lastTapTime = useRef<number>(0);
  const touchCount = useRef<number>(0);

  // Handle Touch Start
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(Date.now());
    setTouchStartY(e.touches[0].clientY);
    longPressTriggered.current = false;
    touchCount.current = e.touches.length;

    // Start Long Press Timer (1.2s)
    timerRef.current = window.setTimeout(() => {
      onLongPress();
      longPressTriggered.current = true;
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]); // Feedback
    }, 1200);
  };

  // Handle Touch End
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear Long Press
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (longPressTriggered.current) return;

    const now = Date.now();
    const touchDuration = now - touchStart;
    const isTap = touchDuration < 250;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    // 2 Finger Swipe Down for Privacy Curtain
    if (touchCount.current === 2 && deltaY > 100) {
        setPrivacyMode(!privacyMode);
        soundEngine.speakSystem(privacyMode ? "Curtain open." : "Curtain closed. Screen is black.");
        if (navigator.vibrate) navigator.vibrate(50);
        return;
    }

    if (isTap) {
      const timeSinceLastTap = now - lastTapTime.current;
      
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // DOUBLE TAP DETECTED
        if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
        onDoubleTap();
        lastTapTime.current = 0;
      } else {
        // Potential Single Tap
        lastTapTime.current = now;
        doubleTapTimer.current = window.setTimeout(() => {
            onSingleTap(); // Fire single tap if no second tap comes
            lastTapTime.current = 0;
        }, 350);
      }
    }
  };

  // Privacy Curtain Overlay
  if (privacyMode) {
      return (
          <div 
            className="fixed inset-0 z-[9999] bg-black cursor-pointer"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()} // Capture all clicks
            aria-label="Privacy Curtain Active. Double tap to toggle system. Swipe up with two fingers to unlock curtain."
          >
             {/* Tiny indicator just so they know the app didn't crash if they have some sight */}
             <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20 flex flex-col items-center">
                <EyeOff className="text-white w-12 h-12 mb-2" />
                <p className="text-white text-xs">PRIVACY MODE ACTIVE</p>
             </div>
          </div>
      );
  }

  // Transparent Gesture Layer for Standard Mode
  return (
    <div 
      className="absolute inset-0 z-[50]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      // We do NOT block pointer events here so underlying interactive elements still work if precisely clicked,
      // but this layer captures "empty space" gestures.
      style={{ pointerEvents: 'none' }} 
    >
       <div 
         className="w-full h-full" 
         style={{ pointerEvents: 'auto' }} // Re-enable pointer events for the gesture surface
         aria-label="Gesture Control Surface"
       />
    </div>
  );
};