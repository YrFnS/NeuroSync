import React from 'react';
import { Scan } from 'lucide-react';
import { NeuroState } from '../../types';

export const ScanningMode: React.FC<{ data: NeuroState['scanData'] }> = ({ data }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 bg-black">
      
      {/* High Visibility Reticle */}
      <div className="relative w-full max-w-md aspect-square border-8 border-[#0047AB] rounded-3xl mb-8 flex items-center justify-center">
        {/* Corner Accents - Thick White Lines */}
        <div className="absolute top-[-4px] left-[-4px] w-20 h-20 border-t-[16px] border-l-[16px] border-white z-10 rounded-tl-xl"></div>
        <div className="absolute top-[-4px] right-[-4px] w-20 h-20 border-t-[16px] border-r-[16px] border-white z-10 rounded-tr-xl"></div>
        <div className="absolute bottom-[-4px] left-[-4px] w-20 h-20 border-b-[16px] border-l-[16px] border-white z-10 rounded-bl-xl"></div>
        <div className="absolute bottom-[-4px] right-[-4px] w-20 h-20 border-b-[16px] border-r-[16px] border-white z-10 rounded-br-xl"></div>

        {/* Center Icon */}
        <Scan className="text-[#0047AB] animate-pulse" size={120} strokeWidth={3} />
      </div>
      
      {/* Data Output */}
      <div className="w-full text-center">
        <div className="inline-block bg-[#0047AB] px-6 py-2 rounded-t-xl">
          <h2 className="text-white font-black text-xl uppercase tracking-widest">Identified</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl w-full border-8 border-[#0047AB]">
            <h1 className="text-5xl font-black text-black mb-3 leading-tight uppercase">{data?.objectName || "Scanning..."}</h1>
            <p className="text-3xl font-bold text-gray-800 leading-snug">{data?.details}</p>
        </div>
      </div>
    </div>
  );
};