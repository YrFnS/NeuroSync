import React from 'react';
import { ShieldAlert, AlertTriangle, Key, Radio } from 'lucide-react';
import { NeuroState } from '../../types';

export const GuardianMode: React.FC<{ data: NeuroState['guardianData'] }> = ({ data }) => (
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
            LOC: {data.location?.lat ? data.location.lat.toFixed(5) : "ACQUIRING..."} <br/>
            LNG: {data.location?.lng ? data.location.lng.toFixed(5) : "ACQUIRING..."} <br/>
            STATUS: {data.location ? "GPS_LOCKED" : "SEARCHING"}
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
