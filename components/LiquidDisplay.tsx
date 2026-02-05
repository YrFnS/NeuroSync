import React, { useEffect, useState } from 'react';
import { AppMode, NeuroState } from '../types';
import { NavigationMode } from './modes/NavigationMode';
import { ReadingMode } from './modes/ReadingMode';
import { ScanningMode } from './modes/ScanningMode';
import { DangerMode } from './modes/DangerMode';
import { GuardianMode } from './modes/GuardianMode';
import { IdleMode } from './modes/IdleMode';
import { Bookmark } from 'lucide-react';

interface Props {
  state: NeuroState;
  videoStream: MediaStream | null;
  onExitGuardian: () => void;
}

export const LiquidDisplay: React.FC<Props> = ({ state, videoStream, onExitGuardian }) => {
  const [showMemoryToast, setShowMemoryToast] = useState<string | null>(null);

  useEffect(() => {
    if (state.guardianData.eventLog.length > 0) {
      const lastEvent = state.guardianData.eventLog[0];
      if (lastEvent.type === 'OBJECT_SEEN' && state.mode !== AppMode.GUARDIAN) {
        setShowMemoryToast(lastEvent.description);
        const timer = setTimeout(() => setShowMemoryToast(null), 4000); 
        return () => clearTimeout(timer);
      }
    }
  }, [state.guardianData.eventLog, state.mode]);

  const isGuardian = state.mode === AppMode.GUARDIAN;
  const isDanger = state.mode === AppMode.DANGER;

  // Safe area padding for modes that coexist with global UI (Header/Footer)
  // Guardian mode takes over screen, so no padding needed.
  // Danger mode is a full screen alert, but needs to sit under header if visible, or over it. 
  // Danger mode is usually high Z, but here it's part of the flow.
  const containerClass = isGuardian ? "w-full h-full" : "w-full h-full pt-28 pb-40 px-4";

  return (
    <div className="w-full h-full relative overflow-hidden bg-black liquid-transition">
      
      {/* Modes Content */}
      <div className={`relative z-10 ${containerClass} flex flex-col`}>
        {state.mode === AppMode.IDLE && <IdleMode />}
        {state.mode === AppMode.NAVIGATION && <NavigationMode data={state.navData} />}
        {state.mode === AppMode.READING && <ReadingMode data={state.readData} />}
        {state.mode === AppMode.SCANNING && <ScanningMode data={state.scanData} />}
        {state.mode === AppMode.DANGER && <DangerMode hazard={state.navData?.hazard || "Unknown Hazard"} />}
        {state.mode === AppMode.GUARDIAN && (
            <GuardianMode 
                data={state.guardianData} 
                videoStream={videoStream} 
                onExit={onExitGuardian} 
            />
        )}
      </div>

      {/* Memory Notification - High Contrast Toast */}
      {showMemoryToast && (
        <div className="absolute top-28 left-0 right-0 z-40 p-4 animate-in slide-in-from-top pointer-events-none">
           <div className="bg-[#0047AB] text-white p-6 rounded-2xl border-4 border-white shadow-2xl flex items-center gap-4 mx-auto max-w-md pointer-events-auto">
             <Bookmark size={48} className="text-[#FFD600] shrink-0" strokeWidth={3} />
             <div>
               <h3 className="text-lg font-bold text-[#FFD600] uppercase tracking-wider mb-1">Saved</h3>
               <p className="text-2xl font-bold leading-snug">{showMemoryToast}</p>
             </div>
           </div>
        </div>
      )}
      
    </div>
  );
};