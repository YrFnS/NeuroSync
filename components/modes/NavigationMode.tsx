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

  // Parse distance numbers for massive display
  const distanceNum = data.distance.replace(/[^0-9.]/g, '');
  const distanceUnit = data.distance.replace(/[0-9.]/g, '');

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} transition-colors duration-300 relative overflow-hidden`}>
      
      {/* 
        TOP SECTION: DISTANCE 
        Massive typography for low vision.
      */}
      <div className="h-[30%] flex items-end justify-center pb-2 z-10">
        <p className="text-[30vh] font-bold leading-none tracking-tighter text-center flex items-baseline">
          {distanceNum}
          <span className="text-[10vh] ml-2 font-bold opacity-80">{distanceUnit}</span>
        </p>
      </div>

      {/* 
        MIDDLE SECTION: DIRECTIONAL ICON
        Takes up majority of screen space.
        Stroke width increased to 4 for visibility.
      */}
      <div className="h-[50%] flex items-center justify-center z-10">
        <div className="pulse-heavy transform scale-150">
           <Icon size={300} strokeWidth={4} fill="currentColor" fillOpacity={0.2} />
        </div>
      </div>

      {/* 
        BOTTOM SECTION: INSTRUCTION LABEL
        High contrast text anchor.
      */}
      <div className="h-[20%] flex items-start justify-center pt-2 z-10">
        <h1 className="text-[10vh] font-black uppercase tracking-wide text-center leading-none">{label}</h1>
      </div>

      {/* 
        HAZARD OVERLAY 
        Overrides everything if hazard exists.
      */}
      {data.hazard && (
        <div className="absolute inset-0 bg-[#FF4D00] flex flex-col items-center justify-center z-50 flash-danger p-8 text-center" role="alert">
          <AlertTriangle size={180} className="mb-8 text-white" fill="black" strokeWidth={4} />
          <h1 className="text-[12vh] font-black text-white mb-6 leading-none">STOP</h1>
          <div className="bg-black w-full py-6 px-4 border-4 border-white rounded-xl">
             <p className="text-4xl font-bold text-[#FFD600] uppercase">{data.hazard}</p>
          </div>
        </div>
      )}
    </div>
  );
};