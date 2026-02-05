import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Disc, Hand, Compass } from 'lucide-react';
import { NeuroState } from '../../types';
import { soundEngine } from '../../utils/soundEngine';

export const NavigationMode: React.FC<{ data: NeuroState['navData'] }> = ({ data }) => {
  const [heading, setHeading] = useState(0);
  const [needsPermission, setNeedsPermission] = useState(false);
  const lastHapticTime = useRef(0);

  useEffect(() => {
    // Check if permission is needed (iOS 13+)
    if (
        typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
        setNeedsPermission(true);
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
        let h = 0;
        if ((e as any).webkitCompassHeading) {
            h = (e as any).webkitCompassHeading;
        } else if (e.alpha !== null) {
            h = 360 - e.alpha; 
        }
        
        setHeading(h);

        // --- HAPTIC COMPASS LOGIC ---
        // Vibrate when facing North (350-10 degrees)
        // Double Pulse for North, Single Pulse for East/West/South
        const now = Date.now();
        if (now - lastHapticTime.current > 600) { // Throttle
            if (h > 350 || h < 10) {
                 if (navigator.vibrate) navigator.vibrate([20, 50, 20]); // Double Tick
                 lastHapticTime.current = now;
                 soundEngine.playCompassTick();
            } else if (Math.abs(h - 90) < 5 || Math.abs(h - 180) < 5 || Math.abs(h - 270) < 5) {
                 if (navigator.vibrate) navigator.vibrate(20); // Single Tick
                 lastHapticTime.current = now;
            }
        }
    };

    if (!needsPermission) {
        window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [needsPermission]);

  const requestAccess = () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          (DeviceOrientationEvent as any).requestPermission()
            .then((response: string) => {
                if (response === 'granted') {
                    setNeedsPermission(false);
                } else {
                    alert('Permission denied. Compass disabled.');
                }
            })
            .catch(console.error);
      }
  };

  if (!data) return null;

  let bgColor = "bg-signal-green";
  let textColor = "text-black";
  let label = "MOVE";
  
  const isStop = data.direction === 'STOP';
  const isLeft = data.direction === 'LEFT';
  const isRight = data.direction === 'RIGHT';
  const isCrosswalk = data.direction === 'CROSSWALK';

  if (isStop) { 
    bgColor = "bg-signal-red"; 
    textColor = "text-white";
    label = "STOP"; 
  }
  
  if (isLeft) label = "LEFT";
  if (isRight) label = "RIGHT";
  
  if (isCrosswalk) { 
    label = "CROSS"; 
    bgColor = "bg-white"; 
    textColor = "text-black";
  }

  const distanceNum = data.distance.replace(/[^0-9.]/g, '');
  const distanceUnit = data.distance.replace(/[0-9.]/g, '');

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} transition-colors duration-300 relative overflow-hidden rounded-3xl border-4 border-white shadow-2xl`}>
      
      {/* ACTIVE RADAR SWEEP */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[spin_4s_linear_infinite]" />
      </div>

      {/* COMPASS RING */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none overflow-hidden">
          <div 
             className="w-[120vw] h-[120vw] border-[40px] border-dashed border-current rounded-full flex items-center justify-center transition-transform duration-200 ease-out"
             style={{ transform: `rotate(${-heading}deg)` }}
          >
              <div className="absolute top-0 w-8 h-24 bg-current"></div>
              {/* East/West/South notches */}
              <div className="absolute right-0 w-8 h-12 bg-current opacity-50"></div>
              <div className="absolute bottom-0 w-8 h-12 bg-current opacity-50"></div>
              <div className="absolute left-0 w-8 h-12 bg-current opacity-50"></div>
          </div>
      </div>

      <div className="flex-1 flex flex-col relative z-10 py-4">
          
          <div className="h-[25%] flex items-end justify-center">
            <div className="flex items-baseline justify-center w-full px-2">
              <span className="font-black leading-none tracking-tighter text-[20vh] md:text-[25vh]">
                {distanceNum}
              </span>
              <span className="font-bold opacity-70 text-[6vh] md:text-[8vh] ml-2 mb-4">
                {distanceUnit}
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center w-full relative">
             {isStop ? (
                <Hand size={200} strokeWidth={3} className="w-[40vh] h-[40vh] animate-pulse" />
             ) : isCrosswalk ? (
                <Disc size={200} strokeWidth={3} className="w-[40vh] h-[40vh] animate-spin-slow" />
             ) : (
                <svg viewBox="0 0 100 100" className={`w-[50vh] h-[50vh] fill-current ${isLeft ? '-rotate-90' : isRight ? 'rotate-90' : ''} transition-transform duration-500 ease-out filter drop-shadow-lg`}>
                    <path d="M50 5 L90 50 L65 50 L65 95 L35 95 L35 50 L10 50 Z" />
                </svg>
             )}
          </div>

          <div className="h-[15%] flex flex-col items-center justify-start pointer-events-auto">
            <h1 className="text-[8vh] font-black uppercase tracking-wide text-center leading-none">{label}</h1>
            
            {needsPermission ? (
                <button 
                    onClick={requestAccess}
                    className="mt-4 bg-black/20 px-4 py-2 rounded-full font-bold text-sm border-2 border-current animate-bounce"
                >
                    Tap to Enable Compass
                </button>
            ) : (
                <div className="flex items-center gap-2 mt-2 opacity-60">
                    <Compass size={24} className={heading > 350 || heading < 10 ? 'text-white fill-current' : ''} />
                    <span className="font-mono font-bold">{Math.round(heading)}° {heading > 350 || heading < 10 ? 'NORTH' : ''}</span>
                </div>
            )}
          </div>
      </div>

      {data.hazard && (
        <div className="absolute inset-0 bg-signal-red flex flex-col items-center justify-center z-[100] flash-danger p-6 text-center" role="alert">
          <AlertTriangle size={120} className="mb-6 text-black" fill="white" strokeWidth={3} />
          <h1 className="text-[10vh] font-black text-white mb-4 leading-none tracking-tighter">DANGER</h1>
          <div className="bg-black w-full py-6 px-4 rounded-3xl border-[6px] border-white shadow-2xl">
             <p className="text-3xl md:text-5xl font-bold text-white uppercase break-words leading-tight">{data.hazard}</p>
          </div>
        </div>
      )}
    </div>
  );
};