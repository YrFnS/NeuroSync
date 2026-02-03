import React from 'react';
import { AppMode, NeuroState } from '../types';
import { ArrowUp, ArrowLeft, ArrowRight, Hand, Scan, Eye, AlertTriangle, ShieldAlert, MapPin, Key, Radio } from 'lucide-react';

interface Props {
  state: NeuroState;
}

const NavigationMode: React.FC<{ data: NeuroState['navData'] }> = ({ data }) => {
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

const ReadingMode: React.FC<{ data: NeuroState['readData'] }> = ({ data }) => {
  return (
    <div className="flex flex-col items-start justify-center h-full w-full p-6 bg-white text-black animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center gap-3 mb-6 text-black border-b-4 border-black pb-2 w-full">
        <Eye size={42} />
        <span className="text-2xl font-black font-mono">TEXT_DETECTED</span>
      </div>
      <p className="text-4xl md:text-5xl font-bold leading-tight font-sans">
        {data?.text || "Processing text..."}
      </p>
    </div>
  );
};

const ScanningMode: React.FC<{ data: NeuroState['scanData'] }> = ({ data }) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full p-4">
      {/* Scanning Reticle */}
      <div className="relative w-64 h-64 border-2 border-blue-500 rounded-lg overflow-hidden mb-8">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500" />
        <div className="scan-line" />
        <div className="absolute inset-0 flex items-center justify-center">
            <Scan className="text-blue-500 opacity-50" size={48} />
        </div>
      </div>
      
      <div className="text-center">
        <h2 className="text-blue-400 font-mono text-xl mb-2">IDENTIFIED_OBJECT</h2>
        <h1 className="text-4xl font-bold text-white mb-4">{data?.objectName || "Analyzing..."}</h1>
        <p className="text-gray-300 text-xl max-w-md">{data?.details}</p>
      </div>
    </div>
  );
};

const DangerMode: React.FC<{ hazard: string }> = ({ hazard }) => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-red-600 animate-pulse">
    <AlertTriangle size={150} className="text-white mb-8" />
    <h1 className="text-7xl font-black text-white text-center">STOP</h1>
    <p className="text-2xl font-bold text-white mt-4">{hazard}</p>
  </div>
);

const GuardianMode: React.FC<{ data: NeuroState['guardianData'] }> = ({ data }) => (
  <div className="flex flex-col h-full w-full bg-slate-900 p-6 animate-in slide-in-from-right duration-500">
    <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4 text-red-500">
            <ShieldAlert size={40} className="animate-pulse" />
            <h1 className="text-2xl font-black font-mono">GUARDIAN_LINK</h1>
        </div>
        <div className="bg-red-500 text-white px-3 py-1 text-xs font-mono rounded">LIVE FEED ACTIVE</div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-20">
       
       {/* Tactical Map Mockup */}
       <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden relative min-h-[300px]">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #4ade80 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          {/* Radar Sweep Effect */}
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-transparent to-green-500/10 rounded-full animate-spin origin-top-left -translate-x-1/2 -translate-y-1/2 duration-3000"></div>

          {/* User Dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
             <div className="w-4 h-4 bg-white rounded-full shadow-lg shadow-green-500/50 z-10"></div>
             <div className="absolute w-12 h-12 bg-green-500/30 rounded-full animate-ping"></div>
          </div>

          {/* Event Markers from History */}
          {data.eventLog.map((event, i) => (
             <div key={event.id} 
                  className="absolute"
                  style={{ 
                      top: `${event.coordinates?.y || 50}%`, 
                      left: `${event.coordinates?.x || 50}%` 
                  }}>
                 <div className={`p-1 rounded-full ${event.type === 'HAZARD_DETECTED' ? 'bg-red-500' : 'bg-blue-500'} animate-bounce`}>
                     {event.type === 'HAZARD_DETECTED' ? <AlertTriangle size={12} className="text-white"/> : <Key size={12} className="text-white"/>}
                 </div>
             </div>
          ))}

          <div className="absolute bottom-4 left-4 bg-black/80 p-2 rounded border border-gray-700 text-xs font-mono text-green-400">
            LOC: {data.location?.lat.toFixed(4)}, {data.location?.lng.toFixed(4)} <br/>
            ACCURACY: HIGH
          </div>
       </div>

       {/* Event Log */}
       <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
          <h3 className="text-gray-400 font-mono text-sm mb-4 flex items-center gap-2">
            <Radio size={16} className="text-green-500" /> SYSTEM_EVENTS
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
             {data.eventLog.length === 0 && <span className="text-gray-600 text-sm font-mono italic">No events logged...</span>}
             
             {data.eventLog.map((event) => (
                <div key={event.id} className="border-l-2 border-slate-600 pl-4 py-1">
                   <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                          event.type === 'HAZARD_DETECTED' ? 'bg-red-900/50 text-red-200' : 
                          event.type === 'OBJECT_SEEN' ? 'bg-blue-900/50 text-blue-200' : 
                          'bg-gray-700 text-gray-300'
                      }`}>{event.type}</span>
                      <span className="text-xs text-gray-500 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                   </div>
                   <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                     {event.description}
                   </p>
                </div>
             ))}
          </div>
       </div>
    </div>
  </div>
);

const IdleMode = () => (
  <div className="flex flex-col items-center justify-center h-full w-full opacity-60">
    <div className="w-24 h-24 border-4 border-white/20 rounded-full flex items-center justify-center animate-spin-slow">
       <div className="w-16 h-16 bg-white/10 rounded-full animate-pulse" />
    </div>
    <p className="mt-6 font-mono text-sm text-gray-400">NEURO_SYNC // STANDBY</p>
    <p className="mt-2 text-xs text-gray-600">Awaiting visual input stream...</p>
  </div>
);

export const LiquidDisplay: React.FC<Props> = ({ state }) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-black liquid-transition">
      {state.mode === AppMode.IDLE && <IdleMode />}
      {state.mode === AppMode.NAVIGATION && <NavigationMode data={state.navData} />}
      {state.mode === AppMode.READING && <ReadingMode data={state.readData} />}
      {state.mode === AppMode.SCANNING && <ScanningMode data={state.scanData} />}
      {state.mode === AppMode.DANGER && <DangerMode hazard={state.navData?.hazard || "Unknown Hazard"} />}
      {state.mode === AppMode.GUARDIAN && <GuardianMode data={state.guardianData} />}
    </div>
  );
};
