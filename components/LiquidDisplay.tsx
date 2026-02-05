import React, { useEffect, useState, memo } from 'react';
import { AppMode, NeuroState } from '../types';
import { NavigationMode } from './modes/NavigationMode';
import { ReadingMode } from './modes/ReadingMode';
import { ScanningMode } from './modes/ScanningMode';
import { DangerMode } from './modes/DangerMode';
import { GuardianMode } from './modes/GuardianMode';
import { IdleMode } from './modes/IdleMode';
import { OfflineMode } from './modes/OfflineMode';
import { Bookmark } from 'lucide-react';

interface Props {
  state: NeuroState;
  videoStream: MediaStream | null;
  onExitGuardian: () => void;
}

// Memoized Wrappers
const MemoIdle = memo(IdleMode);
const MemoNavigation = memo(NavigationMode);
const MemoReading = memo(ReadingMode);
const MemoScanning = memo(ScanningMode);
const MemoDanger = memo(DangerMode);
const MemoGuardian = memo(GuardianMode);
const MemoOffline = memo(OfflineMode);

export const LiquidDisplay: React.FC<Props> = ({ state, videoStream, onExitGuardian }) => {
  const [showMemoryToast, setShowMemoryToast] = useState<string | null>(null);

  useEffect(() => {
    if (state.guardianData.eventLog.length > 0) {
      const lastEvent = state.guardianData.eventLog[0];
      // Show toast if we just learned something new (OBJECT_SEEN) and we aren't already looking at the map
      if (lastEvent.type === 'OBJECT_SEEN' && state.mode !== AppMode.GUARDIAN) {
        setShowMemoryToast(lastEvent.description);
        const timer = setTimeout(() => setShowMemoryToast(null), 4000); 
        return () => clearTimeout(timer);
      }
    }
  }, [state.guardianData.eventLog, state.mode]);

  const isGuardian = state.mode === AppMode.GUARDIAN;
  const isOffline = state.mode === AppMode.OFFLINE;

  // Safe area padding for modes that coexist with global UI (Header/Footer)
  const containerClass = (isGuardian || isOffline) ? "w-full h-full" : "w-full h-full pt-28 pb-40 px-4";

  return (
    <div className="w-full h-full relative overflow-hidden bg-neuro-bg liquid-transition">
      
      {/* Modes Content */}
      <div className={`relative z-10 ${containerClass} flex flex-col`}>
        {state.mode === AppMode.OFFLINE && <MemoOffline stream={videoStream} detections={state.offlineDetections || []} />}
        {state.mode === AppMode.IDLE && <MemoIdle audioStream={videoStream} />}
        {state.mode === AppMode.NAVIGATION && <MemoNavigation data={state.navData} />}
        {state.mode === AppMode.READING && <MemoReading data={state.readData} />}
        {state.mode === AppMode.SCANNING && <MemoScanning data={state.scanData} />}
        {state.mode === AppMode.DANGER && <MemoDanger hazard={state.navData?.hazard || "Unknown Hazard"} />}
        {state.mode === AppMode.GUARDIAN && (
            <MemoGuardian 
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