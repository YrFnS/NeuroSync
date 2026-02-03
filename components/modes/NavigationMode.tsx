import React from 'react';
import { ArrowUp, ArrowLeft, ArrowRight, Hand, AlertTriangle } from 'lucide-react';
import { NeuroState } from '../../types';

export const NavigationMode: React.FC<{ data: NeuroState['navData'] }> = ({ data }) => {
  if (!data) return null;

  let Icon = ArrowUp;
  let color = "text-[#00FF94]";
  let label = "MOVE";

  if (data.direction === 'LEFT') { Icon = ArrowLeft; label = "LEFT"; }
  if (data.direction === 'RIGHT') { Icon = ArrowRight; label = "RIGHT"; }
  if (data.direction === 'STOP') { Icon = Hand; color = "text-red-500"; label = "STOP"; }
  if (data.direction === 'CROSSWALK') { Icon = ArrowUp; label = "CROSSWALK"; color = "text-yellow-400"; }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in zoom-in duration-500">
      <div className={`p-10 border-8 border-current rounded-full mb-8 ${color} pulse-ring`}>
        <Icon size={120} strokeWidth={3} />
      </div>
      <h1 className={`text-6xl font-black font-mono tracking-tighter ${color}`}>{label}</h1>
      <p className="text-3xl mt-4 font-bold text-white">{data.distance}</p>
      {data.hazard && (
        <div className="mt-8 bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-3 animate-pulse">
          <AlertTriangle />
          <span className="font-bold text-xl">{data.hazard}</span>
        </div>
      )}
    </div>
  );
};
