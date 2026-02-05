import React, { useEffect } from 'react';
import { AlertTriangle, Hand } from 'lucide-react';

export const DangerMode: React.FC<{ hazard: string }> = ({ hazard }) => {
  
  // Active Haptic Loop for Danger Mode
  // Ensures physical feedback persists as long as the danger state is active
  useEffect(() => {
    // Distinct SOS Pattern: ... --- ... 
    // Timings: Dot(100ms), Gap(50ms), Dash(400ms), LetterGap(200ms)
    const sosPattern = [
        100, 50, 100, 50, 100, 200,   // S
        400, 50, 400, 50, 400, 200,   // O
        100, 50, 100, 50, 100         // S
    ];

    const pulseHaptics = () => {
        if (navigator.vibrate) {
            // Cancel any existing vibration first
            navigator.vibrate(0);
            navigator.vibrate(sosPattern);
        }
    };

    // Fire immediately on mount
    pulseHaptics();

    // Loop every 3.5s to keep urgency high without overlapping the pattern duration
    const interval = setInterval(pulseHaptics, 3500);

    return () => {
        clearInterval(interval);
        // Kill vibration immediately on exit so it doesn't persist in safe modes
        if (navigator.vibrate) navigator.vibrate(0);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full flash-danger p-6 text-center relative overflow-hidden" role="alert" aria-live="assertive">
      
      {/* Background strobe overlay for extra visual intensity */}
      <div className="absolute inset-0 bg-[#FF4D00] mix-blend-overlay opacity-20 animate-pulse pointer-events-none"></div>

      <div className="bg-white rounded-full p-4 mb-8 animate-[pulse_0.5s_cubic-bezier(0.4,0,0.6,1)_infinite] shadow-[0_0_50px_rgba(255,255,255,0.5)] z-10">
          <Hand size={120} className="text-black" strokeWidth={2.5} />
      </div>
      
      <h1 className="text-[120px] leading-none font-black mb-6 uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10">STOP</h1>
      
      <div className="bg-black px-8 py-6 rounded-2xl border-[6px] border-white w-full shadow-2xl relative overflow-hidden z-10">
          <div className="flex flex-col items-center gap-4 relative z-10">
              <AlertTriangle size={64} className="text-[#FF4D00] animate-bounce" fill="white" strokeWidth={2} />
              <p className="text-3xl md:text-4xl font-bold text-white uppercase leading-tight">{hazard}</p>
          </div>
      </div>

    </div>
  );
};