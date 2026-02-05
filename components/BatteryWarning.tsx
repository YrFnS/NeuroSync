import React from 'react';
import { BatteryWarning as BatteryIcon } from 'lucide-react';

export const BatteryWarning: React.FC<{ level: number }> = ({ level }) => {
  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none">
       <div className="bg-black border-4 border-[#FF4D00] text-[#FF4D00] p-4 rounded-2xl shadow-[0_0_30px_rgba(255,77,0,0.6)] flex items-center gap-4 animate-[pulse_2s_infinite]">
          <div className="bg-[#FF4D00] text-black p-2 rounded-lg shrink-0">
             <BatteryIcon size={32} strokeWidth={3} />
          </div>
          <div>
             <h2 className="text-xl font-black uppercase tracking-wider leading-none mb-1">Low Battery</h2>
             <p className="font-bold text-white text-sm">Device power at {Math.round(level * 100)}%. Plug in soon.</p>
          </div>
       </div>
    </div>
  );
};