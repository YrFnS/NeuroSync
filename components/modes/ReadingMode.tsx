import React from 'react';
import { Eye } from 'lucide-react';
import { NeuroState } from '../../types';

export const ReadingMode: React.FC<{ data: NeuroState['readData'] }> = ({ data }) => {
  return (
    <div className="flex flex-col h-full w-full bg-black text-white p-6 animate-in slide-in-from-bottom duration-300">
      
      {/* Header with Icon - Monochrome High Contrast */}
      <div className="flex items-center gap-4 mb-6 border-b-4 border-white pb-4">
        <div className="bg-white text-black p-3 rounded-xl">
           <Eye size={48} strokeWidth={3} />
        </div>
        <div>
           <span className="text-xl font-bold text-white uppercase tracking-wider block">Reader Active</span>
           <span className="text-sm opacity-60">High Contrast Mode</span>
        </div>
      </div>

      {/* Content Area - Massive Text */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex items-center">
        <p className="text-6xl md:text-8xl font-black leading-tight tracking-wide break-words">
          {data?.text || "Scanning..."}
        </p>
      </div>

      {/* Footer Hint */}
      <div className="mt-4 pt-4 border-t-2 border-gray-800 text-center">
         <p className="opacity-50 font-bold text-lg">Align text in frame</p>
      </div>
    </div>
  );
};