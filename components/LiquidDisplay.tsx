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
}

export const LiquidDisplay: React.FC<Props> = ({ state }) => {
  const [showMemoryToast, setShowMemoryToast] = useState<string | null>(null);

  useEffect(() => {
    if (state.guardianData.eventLog.length > 0) {
      const lastEvent = state.guardianData.eventLog[0];
      if (lastEvent.type === 'OBJECT_SEEN' && state.mode !== AppMode.GUARDIAN) {
        setShowMemoryToast(lastEvent.description);
        const timer = setTimeout(() => setShowMemoryToast(null), 4000); // Longer duration for reading
        return () => clearTimeout(timer);
      }
    }
  }, [state.guardianData.eventLog, state.mode]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black liquid-transition">
      
      {/* High Contrast Frame - Provides context of screen edges */}
      <div className="absolute inset-0 pointer-events-none z-20 border-[6px] border-white/10"></div>

      {/* Modes Content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {state.mode === AppMode.IDLE && <IdleMode />}
        {state.mode === AppMode.NAVIGATION && <NavigationMode data={state.navData} />}
        {state.mode === AppMode.READING && <ReadingMode data={state.readData} />}
        {state.mode === AppMode.SCANNING && <ScanningMode data={state.scanData} />}
        {state.mode === AppMode.DANGER && <DangerMode hazard={state.navData?.hazard || "Unknown Hazard"} />}
        {state.mode === AppMode.GUARDIAN && <GuardianMode data={state.guardianData} />}
      </div>

      {/* Memory Notification - High Contrast Block */}
      {showMemoryToast && (
        <div className="absolute top-20 left-4 right-4 z-40 bg-[#0047AB] text-white p-6 rounded-xl border-4 border-white shadow-2xl animate-in slide-in-from-top">
           <div className="flex items-start gap-4">
             <Bookmark size={32} className="text-[#FFD600] shrink-0" />
             <div>
               <h3 className="text-sm font-bold text-[#FFD600] uppercase tracking-wider mb-1">Item Remembered</h3>
               <p className="text-xl font-bold leading-snug">{showMemoryToast}</p>
             </div>
           </div>
        </div>
      )}
      
    </div>
  );
};