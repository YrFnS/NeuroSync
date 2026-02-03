import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Key, Radio, Share2, Check, Copy } from 'lucide-react';
import { NeuroState } from '../../types';
import L from 'leaflet';

// Constants for Map
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const GuardianMode: React.FC<{ data: NeuroState['guardianData'] }> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup>(L.layerGroup());
  const link = `https://neurosync.app/live/${Math.random().toString(36).substring(7)}`;

  // Custom Icons
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

    // Default to New York if no location
    const initialLat = data.location?.lat || 40.7128;
    const initialLng = data.location?.lng || -74.0060;

    const map = L.map(mapContainerRef.current, {
       zoomControl: false,
       attributionControl: false
    }).setView([initialLat, initialLng], 15);

    L.tileLayer(DARK_TILES, {
        attribution: TILE_ATTR,
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    markersRef.current.addTo(map);
    mapInstanceRef.current = map;

    return () => {
        map.remove();
        mapInstanceRef.current = null;
    };
  }, []);

  // Update Map Position & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // 1. Add User Marker (if location exists)
    if (data.location) {
        L.marker([data.location.lat, data.location.lng], { icon: userIcon })
         .bindPopup("USER LOCATION")
         .addTo(markersRef.current);
        
        // Only pan if it's significantly different to avoid jitter during interaction
        // map.panTo([data.location.lat, data.location.lng]);
    }

    // 2. Add Event Markers
    data.eventLog.forEach(event => {
        if (event.coordinates) {
            const icon = event.type === 'HAZARD_DETECTED' ? hazardIcon : objectIcon;
            L.marker([event.coordinates.lat, event.coordinates.lng], { icon })
             .bindPopup(`<b>${event.type}</b><br>${event.description}`)
             .addTo(markersRef.current);
        }
    });

  }, [data.location, data.eventLog]);

  // Recenter button effect
  const recenter = () => {
      if (mapInstanceRef.current && data.location) {
          mapInstanceRef.current.flyTo([data.location.lat, data.location.lng], 16);
      }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 p-6 animate-in slide-in-from-right duration-500">
      
      {/* Header with Share Action */}
      <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-red-500">
                  <ShieldAlert size={40} className="animate-pulse" />
                  <h1 className="text-2xl font-black font-mono">GUARDIAN_LINK</h1>
              </div>
              <div className="bg-red-500 text-white px-3 py-1 text-xs font-mono rounded">LIVE</div>
          </div>

          {/* Link Generator Simulation */}
          <button 
            onClick={copyLink}
            className="flex items-center justify-between w-full bg-slate-800 border border-slate-600 p-3 rounded-lg group hover:border-green-500 transition-colors"
          >
             <div className="flex items-center gap-3">
                <Share2 size={18} className="text-green-500" />
                <div className="text-left">
                    <p className="text-xs text-gray-400 font-mono">EMERGENCY SHARE LINK</p>
                    <p className="text-sm text-white font-mono truncate max-w-[200px]">{link}</p>
                </div>
             </div>
             <div className="bg-slate-700 p-2 rounded group-hover:bg-slate-600">
                {copied ? <Check size={18} className="text-green-500"/> : <Copy size={18} className="text-white"/>}
             </div>
          </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-20">
         
         {/* Map Container */}
         <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden relative min-h-[300px] flex flex-col">
            <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />
            
            {/* Overlay UI on Map */}
            <div className="absolute bottom-4 left-4 z-[400] bg-black/80 p-2 rounded border border-gray-700 text-xs font-mono text-green-400 pointer-events-none">
              LOC: {data.location?.lat ? data.location.lat.toFixed(5) : "ACQUIRING..."} <br/>
              LNG: {data.location?.lng ? data.location.lng.toFixed(5) : "ACQUIRING..."} <br/>
              STATUS: {data.location ? "GPS_LOCKED" : "SEARCHING"}
            </div>
            
            {data.location && (
                <button onClick={recenter} className="absolute bottom-4 right-4 z-[400] bg-blue-600 text-white p-2 rounded hover:bg-blue-500 shadow-lg">
                    <Radio size={20} />
                </button>
            )}
         </div>

         {/* Event Log */}
         <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
            <h3 className="text-gray-400 font-mono text-sm mb-4 flex items-center gap-2">
              <Radio size={16} className="text-green-500" /> SYSTEM_EVENTS
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
               {data.eventLog.length === 0 && <span className="text-gray-600 text-sm font-mono italic">No events logged...</span>}
               
               {data.eventLog.map((event) => (
                  <div key={event.id} className="border-l-2 border-slate-600 pl-4 py-1 animate-in fade-in slide-in-from-left duration-300">
                     <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                            event.type === 'HAZARD_DETECTED' ? 'bg-red-900/50 text-red-200' : 
                            event.type === 'OBJECT_SEEN' ? 'bg-blue-900/50 text-blue-200' : 
                            'bg-gray-700 text-gray-300'
                        }`}>{event.type}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                     </div>
                     <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                       {event.description}
                     </p>
                     {event.coordinates && (
                        <p className="text-[10px] text-gray-500 font-mono mt-1">
                            [{event.coordinates.lat.toFixed(4)}, {event.coordinates.lng.toFixed(4)}]
                        </p>
                     )}
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};