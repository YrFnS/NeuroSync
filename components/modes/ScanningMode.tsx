import React from 'react';
import { Scan } from 'lucide-react';
import { NeuroState } from '../../types';

export const ScanningMode: React.FC<{ data: NeuroState['scanData'] }> = ({ data }) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full p-4">
      {/* Scanning Reticle */}
      <div className="relative w-64 h-64 border-2 border-blue-500 rounded-lg overflow-hidden mb-8">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500" />
        <div className="scan-line" />
        <div className="absolute inset-0 flex items-center justify-center">
            <Scan className="text-blue-500 opacity-50" size={48} />
        </div>
      </div>
      
      <div className="text-center">
        <h2 className="text-blue-400 font-mono text-xl mb-2">IDENTIFIED_OBJECT</h2>
        <h1 className="text-4xl font-bold text-white mb-4">{data?.objectName || "Analyzing..."}</h1>
        <p className="text-gray-300 text-xl max-w-md">{data?.details}</p>
      </div>
    </div>
  );
};
