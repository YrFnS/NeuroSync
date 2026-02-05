
import { useEffect, useRef } from 'react';

// Sentinel Configuration
const IMPACT_THRESHOLD = 25; // m/s² (approx 2.5G)
const STILLNESS_THRESHOLD = 1.0; // m/s² (allow slight movement)
const RECOVERY_TIME = 3000; // Time (ms) to wait after impact to confirm fall

export const useFallDetection = (onFallDetected: () => void, isActive: boolean = true) => {
    const lastImpactTime = useRef<number>(0);
    const fallTimeout = useRef<number | null>(null);

    useEffect(() => {
        if (!isActive) return;

        const handleMotion = (e: DeviceMotionEvent) => {
            const acc = e.accelerationIncludingGravity;
            if (!acc || !acc.x || !acc.y || !acc.z) return;

            // Calculate Magnitude Vector
            const magnitude = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);

            // Phase 1: Impact Detection
            if (magnitude > IMPACT_THRESHOLD) {
                const now = Date.now();
                // Debounce impacts
                if (now - lastImpactTime.current > 5000) {
                    lastImpactTime.current = now;
                    console.log("SENTINEL: High Impact Detected", magnitude);
                    
                    // Schedule Phase 2 check
                    if (fallTimeout.current) clearTimeout(fallTimeout.current);
                    
                    fallTimeout.current = window.setTimeout(() => {
                        // This timeout only completes if it wasn't cancelled by movement
                        console.log("SENTINEL: Fall Confirmed (Stillness check passed)");
                        onFallDetected();
                    }, RECOVERY_TIME);
                }
            }

            // Phase 2: Stillness Monitor (Cancel if user recovers/moves)
            if (fallTimeout.current && magnitude > (9.8 + 5)) { 
                // If they are moving significantly (more than gravity + 5m/s2) after impact, they are likely okay
                // Note: Gravity is always ~9.8.
                console.log("SENTINEL: Movement detected, cancelling fall trigger");
                clearTimeout(fallTimeout.current);
                fallTimeout.current = null;
            }
        };

        window.addEventListener('devicemotion', handleMotion);
        return () => {
            window.removeEventListener('devicemotion', handleMotion);
            if (fallTimeout.current) clearTimeout(fallTimeout.current);
        };
    }, [isActive, onFallDetected]);
};
