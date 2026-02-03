import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Radio, Share2, Check, Copy, Video, X, MapPin, Footprints, AlertTriangle, ArrowRightCircle, Image as ImageIcon } from 'lucide-react';
import { NeuroState } from '../../types';
import L from 'leaflet';

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; OpenStreetMap contributors &copy; CARTO';

interface Props {
  data: NeuroState['guardianData'];
  videoStream: MediaStream | null;
  onExit: () => void;
}

export const GuardianMode: React.FC<Props> = ({ data, videoStream, onExit }) => {
  const [copied, setCopied] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup>(L.layerGroup());
  const videoRef = useRef<HTMLVideoElement>(null);
  const link = `https://neurosync.app/live/${Math.random().toString(36).substring(7)}`;

  // Attach video stream
  useEffect(() => {
    if (videoRef.current && videoStream) {
        videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Leaflet Icons
  const userIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #00FF94; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px #00FF94; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  const hazardIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #FF2E2E; width: 10px; height: 10px; transform: rotate(45deg); box-shadow: 0 0 10px #FF2E2E;"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });

  const objectIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #2E94FF; width: 8px; height: 8px; border-radius: 2px; box-shadow: 0 0 10px #2E94FF;"></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4]
  });

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const initialLat = data.location?.lat || 40.7128;
    const initialLng = data.location?.lng || -74.0060;

    const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false, dragging: !L.Browser.mobile })
      .setView([initialLat, initialLng], 15);

    L.tileLayer(DARK_TILES, { attribution: TILE_ATTR, maxZoom: 20 }).addTo(map);
    markersRef.current.addTo(map);
    mapInstanceRef.current = map;

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.clearLayers();

    if (data.location) {
        L.marker([data.location.lat, data.location.lng], { icon: userIcon })
         .bindPopup("USER LOCATION")
         .addTo(markersRef.current);
    }

    data.eventLog.forEach(event => {
        if (event.coordinates) {
            const icon = event.type === 'HAZARD_DETECTED' ? hazardIcon : objectIcon;
            const marker = L.marker([event.coordinates.lat, event.coordinates.lng], { icon })
             .addTo(markersRef.current);
            
            let popupContent = `<b>${event.type}</b><br>${event.description}`;
            if (event.snapshot) {
                popupContent += `<br><img src="${event.snapshot}" style="width:100px; margin-top:5px; border:1px solid white;">`;
            }
            marker.bindPopup(popupContent);
        }
    });
  }, [data.location, data.eventLog]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 p-2 md:p-4 animate-in slide-in-from-right duration-500 overflow-y-auto tactical-grid pb-safe">
      
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-4 bg-black/60 p-2 rounded border border-slate-700 backdrop-blur-sm sticky top-0 z-50">
          <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert size={28} className="animate-pulse" />
              <div className="leading-none">
                 <h1 className="text-lg md:text-xl font-black font-mono tracking-tighter text-white">GUARDIAN<span className="text-red-500">_LINK</span></h1>
                 <p className="text-[10px] text-gray-400 font-mono">SECURE CONNECTION // LIVE</p>
              </div>
          </div>
          <button onClick={onExit} className="bg-red-500/10 text-red-500 border border-red-500/50 px-3 py-1.5 rounded font-bold hover:bg-red-500 hover:text-white flex items-center gap-2 transition-all text-xs md:text-sm">
             <X size={16} /> CLOSE
          </button>
      </div>

      {/* Grid Layout - Stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
         
         {/* LEFT COL: Video & Map */}
         <div className="lg:col-span-1 flex flex-col gap-4">
             {/* Live Video Feed */}
             <div className="bg-black rounded-lg border border-slate-700 overflow-hidden relative aspect-video flex flex-col shadow-lg shrink-0">
                <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse flex items-center gap-1 font-mono">
                    <div className="w-2 h-2 bg-white rounded-full"></div> LIVE FEED
                </div>
                {videoStream ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 font-mono text-sm bg-slate-900">
                        <Video size={40} className="mb-2 opacity-50" />
                        NO SIGNAL
                    </div>
                )}
                <div className="absolute inset-0 border-[1px] border-white/10 pointer-events-none"></div>
             </div>

             {/* Map Container */}
             <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden relative min-h-[200px] flex-1 lg:flex-auto flex flex-col shadow-lg">
                <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 opacity-80 mix-blend-lighten" />
                <div className="absolute bottom-2 left-2 z-[400] bg-black/80 p-1.5 rounded border border-gray-700 text-[10px] font-mono text-green-400 pointer-events-none">
                  LOC: {data.location ? "GPS_LOCKED" : "SEARCHING..."}
                </div>
             </div>
         </div>

         {/* CENTER COL: Generative Plan */}
         <div className="lg:col-span-2 flex flex-col gap-4 min-h-[400px]">
            
            {/* Generated Plan Card */}
            <div className="bg-black/40 border border-slate-600 rounded-lg p-1 backdrop-blur-sm flex-1 flex flex-col">
                <div className="bg-slate-800/50 p-2 border-b border-slate-700 flex justify-between items-center">
                   <h2 className="text-sm font-bold text-blue-400 font-mono flex items-center gap-2">
                     <Share2 size={16} /> TACTICAL RESPONSE PLAN
                   </h2>
                   {!data.plan && <span className="text-[10px] text-yellow-400 animate-pulse font-mono">GENERATING...</span>}
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto max-h-[400px] lg:max-h-none">
                    {data.plan ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <h3 className="text-blue-300 text-xs font-mono uppercase mb-1">Recommended Action</h3>
                                <p className="text-xl text-white font-bold leading-tight">{data.plan.recommendedAction}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-800/40 p-3 rounded border border-slate-700">
                                    <div className="flex items-center gap-2 text-green-400 mb-2">
                                        <Footprints size={18} />
                                        <h3 className="text-xs font-mono uppercase">Safe Route</h3>
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed">{data.plan.safeExitRoute}</p>
                                </div>

                                <div className="bg-slate-800/40 p-3 rounded border border-slate-700">
                                    <div className="flex items-center gap-2 text-red-400 mb-2">
                                        <AlertTriangle size={18} />
                                        <h3 className="text-xs font-mono uppercase">Threat Assessment</h3>
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed">{data.plan.hazardSummary}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 min-h-[200px]">
                            <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="font-mono text-sm animate-pulse">ANALYZING ENVIRONMENT SCENE...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Event Log with Thumbnails */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 h-64 flex flex-col shrink-0">
                <h3 className="text-gray-400 font-mono text-xs mb-2 flex items-center gap-2 border-b border-slate-700 pb-2">
                  <Radio size={14} className="text-green-500" /> SYSTEM_LOG
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                   {data.eventLog.map((event) => (
                      <div key={event.id} className="flex gap-2 text-xs font-mono items-start bg-black/20 p-2 rounded">
                         {event.snapshot && (
                            <img src={event.snapshot} alt="Evidence" className="w-12 h-12 object-cover rounded border border-slate-600 shrink-0" />
                         )}
                         <div className="flex flex-col">
                            <div className="flex gap-2">
                                <span className="text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                                <span className={`${event.type === 'HAZARD_DETECTED' ? 'text-red-400' : 'text-green-400'} font-bold`}>
                                    [{event.type}]
                                </span>
                            </div>
                            <span className="text-slate-300 mt-1">{event.description}</span>
                         </div>
                      </div>
                   ))}
                </div>
            </div>

             {/* Share Link Footer */}
            <button 
                onClick={copyLink}
                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg group hover:border-green-500 transition-colors flex items-center justify-between shrink-0"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <Share2 size={16} className="text-green-500 shrink-0" />
                    <span className="text-xs text-gray-400 font-mono truncate">SECURE LINK: <span className="text-white">{link}</span></span>
                </div>
                {copied ? <Check size={16} className="text-green-500 shrink-0"/> : <Copy size={16} className="text-gray-500 group-hover:text-white shrink-0"/>}
            </button>
         </div>

      </div>
    </div>
  );
};