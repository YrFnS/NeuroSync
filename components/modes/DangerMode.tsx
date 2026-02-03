import React from 'react';
import { AlertTriangle, Hand } from 'lucide-react';

export const DangerMode: React.FC<{ hazard: string }> = ({ hazard }) => (
  <div className="flex flex-col items-center justify-center h-full w-full flash-danger p-6 text-center">
    
    <div className="bg-white rounded-full p-4 mb-8">
        <Hand size={120} className="text-black" />
    </div>
    
    <h1 className="text-[120px] leading-none font-black mb-6 uppercase tracking-tighter">STOP</h1>
    
    <div className="bg-black px-8 py-6 rounded-2xl border-[6px] border-white w-full">
        <div className="flex flex-col items-center gap-4">
            <AlertTriangle size={64} className="text-[#FF4D00]" fill="white" />
            <p className="text-3xl font-bold text-white uppercase">{hazard}</p>
        </div>
    </div>

  </div>
);