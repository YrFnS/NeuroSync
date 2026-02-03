import React from 'react';
import { ArrowUp, ArrowLeft, ArrowRight, Hand, AlertTriangle, Disc } from 'lucide-react';
import { NeuroState } from '../../types';

export const NavigationMode: React.FC<{ data: NeuroState['navData'] }> = ({ data }) => {
  if (!data) return null;

  let Icon = ArrowUp;
  let color = "text-[#00FF94]";
  let label = "MOVE";
  let borderColor = "border-[#00FF94]";
  let shadowColor = "shadow-[#00FF94]/50";

  if (data.direction === 'LEFT') { Icon = ArrowLeft; label = "LEFT"; }
  if (data.direction === 'RIGHT') { Icon = ArrowRight; label = "RIGHT"; }
  if (data.direction === 'STOP') { 
    Icon = Hand; 
    color = "text-red-500"; 
    borderColor = "border-red-500";
    shadowColor = "shadow-red-500/50";
    label = "HALT"; 
  }
  if (data.direction === 'CROSSWALK') { 
    Icon = Disc; 
    label = "CROSS"; 
    color = "text-white"; 
    borderColor = "border-white";
    shadowColor = "shadow-white/50";
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in zoom-in duration-300 relative">
      
      {/* Background Radial Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] bg-radial-gradient from-${color.split('-')[1]}-500/10 to-transparent opacity-20 pointer-events-none`}></div>

      {/* Main Indicator */}
      <div className={`relative z-10 p-12 border-[12px] ${borderColor} rounded-full mb-12 ${color} pulse-ring bg-black/50 backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.8)]`}>
        <Icon size={160} strokeWidth={2.5} className="drop-shadow-[0_0_15px_rgba(0,0,0,1)]" />
      </div>

      <h1 className={`relative z-10 text-8xl font-black font-mono tracking-tighter ${color} drop-shadow-[0_0_10px_rgba(0,0,0,1)]`}>{label}</h1>
      
      <div className="relative z-10 mt-6 px-8 py-2 bg-black/80 border border-white/20 rounded-full backdrop-blur-md">
        <p className="text-4xl font-bold text-white font-mono tracking-widest">{data.distance}</p>
      </div>

      {data.hazard && (
        <div className="absolute bottom-32 bg-red-600/90 text-white px-8 py-4 rounded-none skew-x-[-12deg] flex items-center gap-4 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.6)] border-l-4 border-white">
          <AlertTriangle className="skew-x-[12deg]" size={32} />
          <span className="font-bold text-2xl skew-x-[12deg] tracking-wider uppercase">{data.hazard}</span>
        </div>
      )}
    </div>
  );
};