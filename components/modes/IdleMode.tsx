import React from 'react';
import { Mic, Activity, Ear, Eye, Radio } from 'lucide-react';

export const IdleMode = () => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-black p-6 text-center animate-in fade-in duration-500">
    
    <div className="relative mb-12">
        {/* Acoustic Ripple */}
        <div className="absolute inset-0 bg-blue-500 rounded-full opacity-10 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        {/* Visual Ripple */}
        <div className="absolute inset-0 bg-[#FFD600] rounded-full opacity-10 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_1s]"></div>
        
        <div className="w-64 h-64 border-[12px] border-white/5 rounded-full flex items-center justify-center relative bg-black/50 backdrop-blur-sm overflow-hidden">
           
           {/* Inner Core */}
           <div className="w-40 h-40 bg-gray-900 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,214,0,0.2)] border-4 border-[#FFD600] z-10 relative">
              <div className="flex flex-col items-center gap-2">
                 <div className="flex gap-4 items-center">
                    <Ear size={28} className="text-blue-400 animate-pulse" strokeWidth={2.5} />
                    <div className="h-6 w-0.5 bg-gray-700"></div>
                    <Eye size={28} className="text-[#FFD600] animate-pulse" strokeWidth={2.5} />
                 </div>
                 <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">SENSORS ON</span>
              </div>
           </div>

           {/* Orbiting Sensor Ring */}
           <div className="absolute w-full h-full animate-[spin_4s_linear_infinite] opacity-50 pointer-events-none">
               <div className="w-3 h-3 bg-[#FFD600] rounded-full absolute top-5 left-1/2 -translate-x-1/2 shadow-[0_0_15px_#FFD600]"></div>
               <div className="w-3 h-3 bg-blue-500 rounded-full absolute bottom-5 left-1/2 -translate-x-1/2 shadow-[0_0_15px_#3B82F6]"></div>
           </div>
        </div>
    </div>
    
    <h1 className="text-6xl font-black text-white tracking-tight mb-4" aria-label="Status: Active">AWARE</h1>
    
    <div className="bg-gray-900/80 border-l-8 border-[#FFD600] p-6 text-left max-w-sm w-full rounded-r-xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-3">
            <Radio className="text-[#FFD600] animate-pulse" />
            <p className="text-xl text-white font-bold">Multimodal Scan</p>
        </div>
        <div className="space-y-2">
            <p className="text-sm text-gray-400 flex items-center gap-3">
                <span className="w-2 h-2 bg-[#FFD600] rounded-full shadow-[0_0_5px_#FFD600]"></span> 
                <span className="font-mono uppercase tracking-wide">Video Feed Active</span>
            </p>
            <p className="text-sm text-gray-400 flex items-center gap-3">
                <span className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_5px_#60A5FA]"></span> 
                <span className="font-mono uppercase tracking-wide">Acoustic Detect Active</span>
            </p>
        </div>
    </div>
  </div>
);