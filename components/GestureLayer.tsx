
import React, { useRef, useState, useEffect } from 'react';
import { EyeOff, Eye } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface Props {
  onDoubleTap: () => void;
  onTripleTap: () => void;
  onLongPress: () => void;
  onSingleTap: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isConnected: boolean;
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
}

export const GestureLayer: React.FC<Props> = ({ 
  onDoubleTap, 
  onTripleTap,
  onLongPress, 
  onSingleTap,
  onSwipeLeft,
  onSwipeRight,
  isConnected,
  privacyMode,
  setPrivacyMode 
}) => {
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const longPressTriggered = useRef<boolean>(false);
  const tapCount = useRef<number>(0);
  const tapTimer = useRef<number | null>(null);
  const touchCount = useRef<number>(0);

  // Handle Touch Start
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(Date.now());
    setTouchStartX(e.touches[0].clientX);
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
    
    // Calculate Swipes
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    const isSwipe = Math.abs(deltaX) > 80 || Math.abs(deltaY) > 80;

    // 2 Finger Swipe Logic
    if (touchCount.current === 2 && isSwipe) {
        // Vertical Swipe (Privacy)
        if (Math.abs(deltaY) > 80 && Math.abs(deltaX) < 60) {
            setPrivacyMode(!privacyMode);
            soundEngine.speakSystem(privacyMode ? "Curtain open." : "Curtain closed. Screen is black.");
            if (navigator.vibrate) navigator.vibrate(50);
            return;
        }
        // Horizontal Swipe (Filters)
        if (Math.abs(deltaX) > 80 && Math.abs(deltaY) < 60) {
            if (deltaX > 0) {
                onSwipeRight();
            } else {
                onSwipeLeft();
            }
            if (navigator.vibrate) navigator.vibrate(20);
            return;
        }
    }

    if (isTap && !isSwipe) {
      tapCount.current += 1;
      
      if (tapTimer.current) clearTimeout(tapTimer.current);

      tapTimer.current = window.setTimeout(() => {
          if (tapCount.current === 1) {
              onSingleTap();
          } else if (tapCount.current === 2) {
              onDoubleTap();
          } else if (tapCount.current === 3) {
              onTripleTap();
          }
          tapCount.current = 0;
      }, 400); // Slightly longer window to catch triple taps
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
