import React from 'react';
import { Mic, Activity } from 'lucide-react';

export const IdleMode = () => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-black p-6 text-center animate-in fade-in duration-500">
    
    <div className="relative mb-12">
        <div className="absolute inset-0 bg-[#FFD600] rounded-full opacity-20 animate-ping"></div>
        <div className="w-64 h-64 border-[12px] border-[#FFD600] rounded-full flex items-center justify-center relative bg-black/50 backdrop-blur-sm">
           <div className="w-40 h-40 bg-[#FFD600] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,214,0,0.5)]">
              <Mic size={80} className="text-black" strokeWidth={4} />
           </div>
        </div>
    </div>
    
    <h1 className="text-6xl font-black text-white tracking-tight mb-4" aria-label="Status: Active">ACTIVE</h1>
    
    <div className="bg-gray-900/80 border-l-8 border-[#FFD600] p-6 text-left max-w-sm w-full rounded-r-xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-2">
            <Activity className="text-[#FFD600] animate-pulse" />
            <p className="text-2xl text-white font-bold">Listening...</p>
        </div>
        <p className="text-xl text-gray-400">Try: "Where are my keys?"</p>
    </div>
  </div>
);