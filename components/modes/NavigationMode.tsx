import React from 'react';
import { ArrowUp, ArrowLeft, ArrowRight, Hand, AlertTriangle, Disc } from 'lucide-react';
import { NeuroState } from '../../types';

export const NavigationMode: React.FC<{ data: NeuroState['navData'] }> = ({ data }) => {
  if (!data) return null;

  let Icon = ArrowUp;
  let bgColor = "bg-[#FFD600]"; // Safety Yellow (Default Go)
  let textColor = "text-black";
  let label = "MOVE";
  
  // Directions
  if (data.direction === 'LEFT') { Icon = ArrowLeft; label = "LEFT"; }
  if (data.direction === 'RIGHT') { Icon = ArrowRight; label = "RIGHT"; }
  
  // Stop Condition
  if (data.direction === 'STOP') { 
    Icon = Hand; 
    bgColor = "bg-[#FF4D00]"; // Signal Orange
    textColor = "text-white";
    label = "STOP"; 
  }
  
  // Crosswalk
  if (data.direction === 'CROSSWALK') { 
    Icon = Disc; 
    label = "CROSS"; 
    bgColor = "bg-white"; 
    textColor = "text-black";
  }

  // Parse distance numbers
  const distanceNum = data.distance.replace(/[^0-9.]/g, '');
  const distanceUnit = data.distance.replace(/[0-9.]/g, '');

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} transition-colors duration-300 relative overflow-hidden pb-safe`}>
      
      {/* 
        DISTANCE DISPLAY
        Scales with Viewport Width to ensure fit on mobile
      */}
      <div className="flex-1 flex items-end justify-center pb-2 md:pb-4 min-h-0">
        <div className="flex items-baseline justify-center w-full px-2">
          <span className="font-bold leading-none tracking-tighter text-[35vw] md:text-[35vh]">
            {distanceNum}
          </span>
          <span className="font-bold opacity-70 text-[10vw] md:text-[10vh] ml-2">
            {distanceUnit}
          </span>
        </div>
      </div>

      {/* 
        DIRECTIONAL ICON
        Central, dominant, simple.
      */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="transform scale-125 md:scale-150">
           <Icon size={180} className="md:w-[240px] md:h-[240px]" strokeWidth={5} fill="currentColor" fillOpacity={0.0} />
        </div>
      </div>

      {/* 
        LABEL
        Bottom anchor.
      */}
      <div className="h-[15%] flex items-start justify-center pt-2 md:pt-4">
        <h1 className="text-[12vw] md:text-[8vh] font-black uppercase tracking-wide text-center leading-none">{label}</h1>
      </div>

      {/* 
        HAZARD OVERLAY 
        Simplified High Contrast Hazard
      */}
      {data.hazard && (
        <div className="absolute inset-0 bg-[#FF4D00] flex flex-col items-center justify-center z-50 flash-danger p-6 text-center" role="alert">
          <AlertTriangle size={120} className="mb-4 text-black md:w-[150px] md:h-[150px]" fill="white" strokeWidth={3} />
          <h1 className="text-[20vw] md:text-[15vh] font-black text-white mb-4 leading-none">STOP</h1>
          <div className="bg-black w-full py-4 px-4 rounded-2xl border-4 border-white">
             <p className="text-2xl md:text-4xl font-bold text-[#FFD600] uppercase break-words">{data.hazard}</p>
          </div>
        </div>
      )}
    </div>
  );
};