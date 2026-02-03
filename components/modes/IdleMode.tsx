import React from 'react';

export const IdleMode = () => (
  <div className="flex flex-col items-center justify-center h-full w-full opacity-60">
    <div className="w-24 h-24 border-4 border-white/20 rounded-full flex items-center justify-center animate-spin-slow">
       <div className="w-16 h-16 bg-white/10 rounded-full animate-pulse" />
    </div>
    <p className="mt-6 font-mono text-sm text-gray-400">NEURO_SYNC // STANDBY</p>
    <p className="mt-2 text-xs text-gray-600">Awaiting visual input stream...</p>
  </div>
);
