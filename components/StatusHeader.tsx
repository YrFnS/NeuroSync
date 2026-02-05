
import React from 'react';
import { Activity, ShieldAlert } from 'lucide-react';
import { AppMode } from '../types';

interface Props {
    mode: AppMode;
    isConnected: boolean;
    privacyMode: boolean;
    onActivateGuardian: () => void;
}

export const StatusHeader: React.FC<Props> = ({ mode, isConnected, privacyMode, onActivateGuardian }) => {
    if (mode === AppMode.GUARDIAN || privacyMode) return null;

    // Z-Index elevated to 60 to sit ABOVE the GestureLayer (z-40)
    return (
        <div className="absolute top-0 left-0 w-full p-2 pt-safe z-[60] flex justify-between pointer-events-none items-start">
           <div 
              className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 rounded-xl border-4 ${isConnected ? 'border-[#FFD600] bg-black text-[#FFD600]' : 'border-gray-600 bg-neuro-ui text-gray-400'} mt-2 ml-2 transition-all duration-300`}
              role="status"
              aria-live="polite"
           >
              <Activity className={`${isConnected ? 'animate-pulse' : ''}`} size={20} strokeWidth={4} />
              <span className="font-bold text-base md:text-lg tracking-wider">
                  {isConnected ? 'LIVE' : 'OFF'}
              </span>
           </div>
           
           <div className="flex items-center gap-2 mt-2 mr-2">
               <button 
                onClick={onActivateGuardian}
                className="pointer-events-auto bg-[#FF4D00] text-white border-4 border-white px-3 py-2 rounded-xl font-bold text-sm md:text-base animate-pulse hover:bg-red-600 active:scale-95 shadow-xl flex items-center gap-2 transition-transform"
                aria-label="Emergency Help"
               >
                 <ShieldAlert size={20} strokeWidth={4} /> HELP
               </button>
           </div>
        </div>
    );
};
