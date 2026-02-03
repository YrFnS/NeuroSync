import React from 'react';
import { NeuroState } from '../../types';

export const ScanningMode: React.FC<{ data: NeuroState['scanData'] }> = ({ data }) => {
  return (
    <div className="flex flex-col h-full w-full bg-black p-4">
      
      {/* Top Label */}
      <div className="mt-8 mb-4 text-center">
        <span className="bg-[#0047AB] text-white px-6 py-2 rounded-full text-xl font-bold uppercase tracking-widest">
          Scanner Active
        </span>
      </div>

      {/* High Visibility Viewfinder - Simplified */}
      <div className="flex-1 relative border-[12px] border-white rounded-3xl m-4 flex items-center justify-center">
         {/* Crosshair */}
         <div className="absolute w-8 h-8 bg-[#0047AB] rounded-full opacity-50"></div>
         
         {!data ? (
            <p className="text-2xl text-gray-400 font-bold animate-pulse">Analyzing...</p>
         ) : (
             <div className="text-center p-6 bg-black/90 w-full h-full flex flex-col items-center justify-center rounded-2xl">
                <h1 className="text-6xl font-black text-white mb-6 uppercase leading-tight">{data.objectName}</h1>
                <p className="text-3xl font-bold text-[#FFD600] leading-snug">{data.details}</p>
             </div>
         )}
      </div>

      {/* Footer Instructions */}
      <div className="mb-8 text-center">
          <p className="text-gray-500 font-bold text-xl">Hold object steady in frame</p>
      </div>

    </div>
  );
};