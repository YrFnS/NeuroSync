import React from 'react';
import { Eye } from 'lucide-react';
import { NeuroState } from '../../types';

export const ReadingMode: React.FC<{ data: NeuroState['readData'] }> = ({ data }) => {
  return (
    <div className="flex flex-col items-start justify-center h-full w-full p-6 bg-white text-black animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center gap-3 mb-6 text-black border-b-4 border-black pb-2 w-full">
        <Eye size={42} />
        <span className="text-2xl font-black font-mono">TEXT_DETECTED</span>
      </div>
      <p className="text-4xl md:text-5xl font-bold leading-tight font-sans">
        {data?.text || "Processing text..."}
      </p>
    </div>
  );
};
