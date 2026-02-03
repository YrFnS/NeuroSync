import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const DangerMode: React.FC<{ hazard: string }> = ({ hazard }) => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-red-600 animate-pulse">
    <AlertTriangle size={150} className="text-white mb-8" />
    <h1 className="text-7xl font-black text-white text-center">STOP</h1>
    <p className="text-2xl font-bold text-white mt-4">{hazard}</p>
  </div>
);
