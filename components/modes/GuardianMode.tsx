import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Radio, Share2, Check, Copy, X, Terminal, Footprints, AlertTriangle } from 'lucide-react';
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
  const pathRef = useRef<L.Polyline | null>(null);
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
    html: `<div style="background-color: #00FF94; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 15px #00FF94; border: 2px solid white;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const hazardIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #FF4D00; width: 12px; height: 12px; transform: rotate(45deg); box-shadow: 0 0 10px #FF4D00; border: 1px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  const memoryIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #0047AB; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 10px #0047AB; border: 1px solid white;"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });

  const shareOrCopy = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'NeuroSync Emergency',
                text: 'I need assistance. Here is my live status.',
                url: link
            });
            return;
        } catch (e) {
            // Fallback
        }
    }
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
      .setView([initialLat, initialLng], 16);

    L.tileLayer(DARK_TILES, { attribution: TILE_ATTR, maxZoom: 20 }).addTo(map);
    markersRef.current.addTo(map);
    mapInstanceRef.current = map;

    // Handle Resize
    const resizeObserver = new ResizeObserver(() => {
       map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => { 
        resizeObserver.disconnect();
        map.remove(); 
        mapInstanceRef.current = null; 
    };
  }, []);

  // Update Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.clearLayers();

    // 0. Update Breadcrumb Trail
    if (data.locationHistory.length > 1) {
        const latLngs = data.locationHistory.map(loc => [loc.lat, loc.lng] as L.LatLngExpression);
        
        if (pathRef.current) {
            pathRef.current.setLatLngs(latLngs);
        } else {
            pathRef.current = L.polyline(latLngs, {
                color: '#00FF94',
                weight: 3,
                opacity: 0.5,
                dashArray: '10, 10',
                lineCap: 'round'
            }).addTo(map);
        }
    }

    // 1. Add User Marker
    if (data.location) {
        L.marker([data.location.lat, data.location.lng], { icon: userIcon, zIndexOffset: 1000 })
         .bindPopup("TARGET: USER")
         .addTo(markersRef.current);
        map.panTo([data.location.lat, data.location.lng], { animate: true });
    }

    // 2. Add Event Log Markers (Hazards & Memories)
    data.eventLog.forEach(event => {
        if (event.coordinates) {
            const isHazard = event.type === 'HAZARD_DETECTED';
            const icon = isHazard ? hazardIcon : memoryIcon;
            
            // Build rich popup content
            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
                <div style="min-width: 200px; font-family: system-ui;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                         <span style="color: ${isHazard ? '#FF4D00' : '#0047AB'}; font-weight: 900; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;">
                            ${isHazard ? '⚠️ HAZARD' : '📍 MEMORY'}
                         </span>
                         <span style="color: #666; font-size: 10px;">
                            ${new Date(event.timestamp).toLocaleTimeString()}
                         </span>
                    </div>
                    <p style="color: white; font-size: 13px; font-weight: 700; line-height: 1.2; margin-bottom: 8px;">${event.description}</p>
                    ${event.snapshot ? `<div style="width: 100%; aspect-ratio: 16/9; background: #222; border-radius: 4px; border: 1px solid #444; overflow: hidden; display: flex; align-items: center; justify-content: center;"><img src="${event.snapshot}" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}
                </div>
            `;

            L.marker([event.coordinates.lat, event.coordinates.lng], { icon })
             .bindPopup(popupContent, { 
                closeButton: false,
                className: 'custom-popup-wrapper' 
             })
             .addTo(markersRef.current);
        }
    });

  }, [data.location, data.eventLog, data.locationHistory]);

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] p-2 md:p-4 animate-in slide-in-from-right duration-500 overflow-y-auto pb-safe font-mono">
      
      {/* Tactical Header */}
      <div className="flex items-center justify-between mb-4 bg-red-900/10 border-b border-red-500/30 pb-2 sticky top-0 z-50 backdrop-blur-md">
          <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert size={32} className="animate-pulse" />
              <div className="leading-none">
                 <h1 className="text-xl font-black tracking-tighter text-white">GUARDIAN<span className="text-red-500">_LINK</span></h1>
                 <p className="text-[10px] text-red-400 opacity-80">EMERGENCY PROTOCOL ACTIVE</p>
              </div>
          </div>
          <button onClick={onExit} className="bg-red-500/10 text-red-500 border border-red-500/50 px-4 py-2 rounded font-bold hover:bg-red-500 hover:text-white flex items-center gap-2 transition-all text-sm">
             <X size={16} /> ABORT
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
         
         {/* LEFT COL: Live Intel */}
         <div className="lg:col-span-1 flex flex-col gap-4">
             {/* Live Video Feed with HUD */}
             <div className="bg-black rounded border border-slate-700 overflow-hidden relative aspect-video flex flex-col shadow-lg shrink-0 group">
                <div className="absolute top-2 left-2 z-10 bg-red-600/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div> LIVE_FEED
                </div>
                {videoStream ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">NO SIGNAL</div>
                )}
                <div className="absolute inset-0 border-[1px] border-white/5 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
                     <div className="border-r border-b border-white"></div>
                     <div className="border-r border-b border-white"></div>
                     <div className="border-b border-white"></div>
                </div>
             </div>

             {/* Map Container */}
             <div className="bg-slate-900 rounded border border-slate-700 overflow-hidden relative min-h-[250px] flex-1 lg:flex-auto flex flex-col shadow-lg">
                <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 opacity-80 grayscale contrast-125" />
                <div className="absolute bottom-2 left-2 z-[400] bg-black/90 p-1 rounded border border-green-900 text-[10px] text-green-500 pointer-events-none">
                  GPS_LOCK: {data.location ? `${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)}` : "ACQUIRING..."}
                </div>
             </div>
         </div>

         {/* CENTER COL: Generative Plan & Terminal */}
         <div className="lg:col-span-2 flex flex-col gap-4">
            
            {/* AI Response Plan */}
            <div className="bg-slate-900/50 border border-slate-700 rounded p-1 flex-1 flex flex-col min-h-[300px]">
                <div className="bg-slate-900 p-2 border-b border-slate-800 flex justify-between items-center">
                   <h2 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                     <Terminal size={14} /> AI_TACTICAL_RESPONSE
                   </h2>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto">
                    {data.plan ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            
                            <div className="border-l-2 border-blue-500 pl-4">
                                <h3 className="text-blue-500 text-[10px] uppercase mb-1 tracking-widest">Primary Objective</h3>
                                <p className="text-2xl text-white font-bold leading-tight">{data.plan.recommendedAction}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-green-900/10 p-3 rounded border border-green-900/30">
                                    <div className="flex items-center gap-2 text-green-400 mb-2">
                                        <Footprints size={16} />
                                        <h3 className="text-[10px] uppercase tracking-wider">Extraction Route</h3>
                                    </div>
                                    <p className="text-sm text-green-100/80">{data.plan.safeExitRoute}</p>
                                </div>

                                <div className="bg-red-900/10 p-3 rounded border border-red-900/30">
                                    <div className="flex items-center gap-2 text-red-400 mb-2">
                                        <AlertTriangle size={16} />
                                        <h3 className="text-[10px] uppercase tracking-wider">Threats</h3>
                                    </div>
                                    <p className="text-sm text-red-100/80">{data.plan.hazardSummary}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                            <div className="font-mono text-xs flex flex-col items-center gap-1">
                                <span className="animate-pulse">ANALYZING SCENE GEOMETRY...</span>
                                <span className="animate-pulse delay-75">CALCULATING EXIT VECTORS...</span>
                                <span className="animate-pulse delay-150">DETECTING HAZARDS...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Transcript / Terminal Log */}
            <div className="bg-black p-3 rounded border border-slate-800 h-48 flex flex-col shrink-0">
                <h3 className="text-slate-500 text-[10px] mb-2 flex items-center gap-2 border-b border-slate-900 pb-2">
                  <Radio size={12} className="text-yellow-500" /> TRANSCRIPT_LOG
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px] pr-2 custom-scrollbar">
                   {data.transcript.map((line, i) => (
                      <div key={i} className="text-green-500/80 break-words border-l border-green-900/30 pl-2">
                        <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {line}
                      </div>
                   ))}
                   {data.eventLog.map((event) => (
                      <div key={event.id} className="text-blue-400/80 break-words border-l border-blue-900/30 pl-2">
                        <span className="text-slate-600 mr-2">[{new Date(event.timestamp).toLocaleTimeString()}]</span>
                        <span className={event.type === 'HAZARD_DETECTED' ? 'text-red-500 font-bold' : ''}>{event.type}:</span> {event.description}
                      </div>
                   ))}
                </div>
            </div>

             {/* Share Link Footer */}
            <button 
                onClick={shareOrCopy}
                className="w-full bg-slate-900 border border-slate-800 p-3 rounded group hover:bg-slate-800 transition-colors flex items-center justify-between shrink-0"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <Share2 size={16} className="text-blue-500 shrink-0" />
                    <span className="text-xs text-slate-400 truncate">ACCESS_KEY: <span className="text-slate-200">{link}</span></span>
                </div>
                {copied ? <Check size={16} className="text-green-500 shrink-0"/> : <Copy size={16} className="text-slate-600 group-hover:text-white shrink-0"/>}
            </button>
         </div>

      </div>
    </div>
  );
};