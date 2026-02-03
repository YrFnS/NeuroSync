import React, { useEffect, useState } from 'react';
import { AppMode, NeuroState } from '../types';
import { NavigationMode } from './modes/NavigationMode';
import { ReadingMode } from './modes/ReadingMode';
import { ScanningMode } from './modes/ScanningMode';
import { DangerMode } from './modes/DangerMode';
import { GuardianMode } from './modes/GuardianMode';
import { IdleMode } from './modes/IdleMode';
import { BrainCircuit } from 'lucide-react';

interface Props {
  state: NeuroState;
}

export const LiquidDisplay: React.FC<Props> = ({ state }) => {
  const [showMemoryToast, setShowMemoryToast] = useState<string | null>(null);

  // Watch for new memory events to trigger a toast
  useEffect(() => {
    if (state.guardianData.eventLog.length > 0) {
      const lastEvent = state.guardianData.eventLog[0];
      // Only show toast for object sightings if we are not in guardian mode (to avoid clutter)
      if (lastEvent.type === 'OBJECT_SEEN' && state.mode !== AppMode.GUARDIAN) {
        setShowMemoryToast(lastEvent.description);
        const timer = setTimeout(() => setShowMemoryToast(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [state.guardianData.eventLog, state.mode]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black liquid-transition">
      
      {/* HUD Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none z-20">
         {/* Top Left Corner */}
         <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-white/20 rounded-tl-lg"></div>
         {/* Top Right Corner */}
         <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-white/20 rounded-tr-lg"></div>
         {/* Bottom Left Corner */}
         <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-white/20 rounded-bl-lg"></div>
         {/* Bottom Right Corner */}
         <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-white/20 rounded-br-lg"></div>
         
         {/* Center Grid */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
      </div>

      {/* Modes Content */}
      <div className="relative z-10 w-full h-full">
        {state.mode === AppMode.IDLE && <IdleMode />}
        {state.mode === AppMode.NAVIGATION && <NavigationMode data={state.navData} />}
        {state.mode === AppMode.READING && <ReadingMode data={state.readData} />}
        {state.mode === AppMode.SCANNING && <ScanningMode data={state.scanData} />}
        {state.mode === AppMode.DANGER && <DangerMode hazard={state.navData?.hazard || "Unknown Hazard"} />}
        {state.mode === AppMode.GUARDIAN && <GuardianMode data={state.guardianData} />}
      </div>

      {/* Passive Awareness Toast */}
      {showMemoryToast && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-3 bg-blue-950/90 border border-blue-500/50 backdrop-blur-md px-6 py-3 rounded-none skew-x-[-10deg] animate-in slide-in-from-top duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
           <BrainCircuit size={18} className="text-blue-300 skew-x-[10deg]" />
           <span className="text-sm text-blue-100 font-mono tracking-widest skew-x-[10deg]">MEMORY_LOG: {showMemoryToast.substring(0, 30)}...</span>
        </div>
      )}
      
    </div>
  );
};