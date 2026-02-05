import React from 'react';
import { NeuroState } from '../../types';

export const ScanningMode: React.FC<{ data: NeuroState['scanData'] }> = ({ data }) => {
  return (
    <div className="flex flex-col h-full w-full bg-neuro-bg text-neuro-text">
      
      {/* Top Label */}
      <div className="mb-4 text-center">
        <span className="bg-[#0047AB] text-white px-6 py-2 rounded-full text-xl font-bold uppercase tracking-widest border-2 border-white">
          Scanner Active
        </span>
      </div>

      {/* High Visibility Viewfinder */}
      <div className="flex-1 relative border-[8px] md:border-[12px] border-neuro-text rounded-3xl flex items-center justify-center overflow-hidden bg-neuro-ui/50">
         {/* Corner Markers */}
         <div className="absolute top-0 left-0 w-12 h-12 border-t-[12px] border-l-[12px] border-[#FFD600]"></div>
         <div className="absolute top-0 right-0 w-12 h-12 border-t-[12px] border-r-[12px] border-[#FFD600]"></div>
         <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[12px] border-l-[12px] border-[#FFD600]"></div>
         <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[12px] border-r-[12px] border-[#FFD600]"></div>
         
         {/* Center Crosshair */}
         <div className="absolute w-4 h-4 bg-[#FFD600] rounded-full z-0 opacity-50"></div>
         
         {!data ? (
            <p className="text-2xl opacity-60 font-bold animate-pulse z-10">Analyzing Object...</p>
         ) : (
             <div className="text-center p-6 bg-neuro-bg/90 backdrop-blur-md w-full h-full flex flex-col items-center justify-center z-10">
                <h1 className="text-5xl md:text-6xl font-black mb-6 uppercase leading-tight drop-shadow-lg">{data.objectName}</h1>
                <div className="w-16 h-2 bg-[#FFD600] mb-6"></div>
                <p className="text-2xl md:text-3xl font-bold text-[#FFD600] leading-snug">{data.details}</p>
             </div>
         )}
      </div>

      {/* Footer Instructions */}
      <div className="mt-4 text-center">
          <p className="opacity-50 font-bold text-lg md:text-xl">Hold object steady in frame</p>
      </div>

    </div>
  );
};