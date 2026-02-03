import React from 'react';
import { Mic } from 'lucide-react';

export const IdleMode = () => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-black p-6 text-center">
    
    <div className="w-64 h-64 border-[16px] border-[#FFD600] rounded-full flex items-center justify-center animate-pulse mb-12">
       <div className="w-40 h-40 bg-[#FFD600] rounded-full flex items-center justify-center">
          <Mic size={80} className="text-black" strokeWidth={4} />
       </div>
    </div>
    
    <h1 className="text-6xl font-black text-white tracking-tight mb-4">ACTIVE</h1>
    
    <div className="bg-gray-900 border-l-8 border-[#FFD600] p-6 text-left max-w-sm w-full">
        <p className="text-2xl text-white font-bold mb-2">I am listening.</p>
        <p className="text-xl text-gray-400">Ask: "Where are my keys?"</p>
    </div>
  </div>
);