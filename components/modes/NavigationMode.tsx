import React from 'react';
import { AlertTriangle, Disc, Hand } from 'lucide-react';
import { NeuroState } from '../../types';

export const NavigationMode: React.FC<{ data: NeuroState['navData'] }> = ({ data }) => {
  if (!data) return null;

  let bgColor = "bg-[#FFD600]"; // Safety Yellow (Default Go)
  let textColor = "text-black";
  let label = "MOVE";
  
  // Directions logic
  const isStop = data.direction === 'STOP';
  const isLeft = data.direction === 'LEFT';
  const isRight = data.direction === 'RIGHT';
  const isCrosswalk = data.direction === 'CROSSWALK';

  if (isStop) { 
    bgColor = "bg-[#FF4D00]"; // Signal Orange
    textColor = "text-white";
    label = "STOP"; 
  }
  
  if (isLeft) label = "LEFT";
  if (isRight) label = "RIGHT";
  
  if (isCrosswalk) { 
    label = "CROSS"; 
    bgColor = "bg-white"; 
    textColor = "text-black";
  }

  // Parse distance
  const distanceNum = data.distance.replace(/[^0-9.]/g, '');
  const distanceUnit = data.distance.replace(/[0-9.]/g, '');

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} transition-colors duration-300 relative overflow-hidden rounded-3xl border-4 border-white shadow-2xl`}>
      
      {/* 
        MASSIVE DIRECTIONAL INDICATOR 
      */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          {/* Subtle texture or pattern could go here */}
      </div>

      <div className="flex-1 flex flex-col relative z-10 py-4">
          
          {/* TOP: Distance */}
          <div className="h-[25%] flex items-end justify-center">
            <div className="flex items-baseline justify-center w-full px-2">
              <span className="font-black leading-none tracking-tighter text-[20vh] md:text-[25vh]">
                {distanceNum}
              </span>
              <span className="font-bold opacity-70 text-[6vh] md:text-[8vh] ml-2 mb-4">
                {distanceUnit}
              </span>
            </div>
          </div>

          {/* MIDDLE: The Arrow / Icon */}
          <div className="flex-1 flex items-center justify-center w-full relative">
             {isStop ? (
                <Hand size={200} strokeWidth={3} className="w-[40vh] h-[40vh] animate-pulse" />
             ) : isCrosswalk ? (
                <Disc size={200} strokeWidth={3} className="w-[40vh] h-[40vh] animate-spin-slow" />
             ) : (
                 // Directional Arrow SVG
                <svg viewBox="0 0 100 100" className={`w-[50vh] h-[50vh] fill-current ${isLeft ? '-rotate-90' : isRight ? 'rotate-90' : ''} transition-transform duration-500 ease-out filter drop-shadow-lg`}>
                    <path d="M50 5 L90 50 L65 50 L65 95 L35 95 L35 50 L10 50 Z" />
                </svg>
             )}
          </div>

          {/* BOTTOM: Label */}
          <div className="h-[15%] flex items-start justify-center">
            <h1 className="text-[8vh] font-black uppercase tracking-wide text-center leading-none">{label}</h1>
          </div>
      </div>

      {/* 
        HAZARD OVERLAY 
        High priority interrupt
      */}
      {data.hazard && (
        <div className="absolute inset-0 bg-[#FF4D00] flex flex-col items-center justify-center z-[100] flash-danger p-6 text-center" role="alert">
          <AlertTriangle size={120} className="mb-6 text-black" fill="white" strokeWidth={3} />
          <h1 className="text-[10vh] font-black text-white mb-4 leading-none tracking-tighter">DANGER</h1>
          <div className="bg-black w-full py-6 px-4 rounded-3xl border-[6px] border-white shadow-2xl">
             <p className="text-3xl md:text-5xl font-bold text-[#FFD600] uppercase break-words leading-tight">{data.hazard}</p>
          </div>
        </div>
      )}
    </div>
  );
};