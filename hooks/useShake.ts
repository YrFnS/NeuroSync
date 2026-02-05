import { useEffect, useState, useRef } from 'react';

export const useShake = (threshold = 15, onShake: () => void) => {
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastZ = useRef(0);
  const lastUpdate = useRef(0);
  const shakeTimeout = useRef<number | null>(null);

  useEffect(() => {
    const handleMotion = (e: DeviceMotionEvent) => {
      if (!e.accelerationIncludingGravity) return;

      const current = Date.now();
      if ((current - lastUpdate.current) > 100) {
        const diffTime = current - lastUpdate.current;
        lastUpdate.current = current;

        const x = e.accelerationIncludingGravity.x || 0;
        const y = e.accelerationIncludingGravity.y || 0;
        const z = e.accelerationIncludingGravity.z || 0;

        const speed = Math.abs(x + y + z - lastX.current - lastY.current - lastZ.current) / diffTime * 10000;

        if (speed > threshold * 100) { // Scale threshold
             // Debounce shake
             if (!shakeTimeout.current) {
                onShake();
                shakeTimeout.current = window.setTimeout(() => {
                    shakeTimeout.current = null;
                }, 1000);
             }
        }

        lastX.current = x;
        lastY.current = y;
        lastZ.current = z;
      }
    };

    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
        window.removeEventListener('devicemotion', handleMotion);
    };
  }, [threshold, onShake]);
};