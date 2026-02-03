import React from 'react';
import { Eye } from 'lucide-react';
import { NeuroState } from '../../types';

export const ReadingMode: React.FC<{ data: NeuroState['readData'] }> = ({ data }) => {
  return (
    <div className="flex flex-col h-full w-full bg-black text-white p-6 animate-in slide-in-from-bottom duration-300">
      
      {/* Header with Icon */}
      <div className="flex items-center gap-4 mb-6 border-b-4 border-[#FFD600] pb-4">
        <div className="bg-[#FFD600] text-black p-3 rounded-xl">
           <Eye size={48} strokeWidth={3} />
        </div>
        <div>
           <span className="text-xl font-bold text-[#FFD600] uppercase tracking-wider block">Reader Active</span>
           <span className="text-sm text-gray-400">Hold camera steady</span>
        </div>
      </div>

      {/* Content Area - Massive White Text on Black */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <p className="text-5xl md:text-7xl font-bold leading-tight tracking-wide break-words text-white">
          {data?.text || "Aligning text..."}
        </p>
      </div>

      {/* Footer Hint */}
      <div className="mt-4 pt-4 border-t-2 border-gray-800 text-center">
         <p className="text-gray-500 font-bold text-lg">AI is extracting text...</p>
      </div>
    </div>
  );
};