import React, { useRef, useEffect } from 'react';
import { WifiOff, Cpu, ShieldCheck } from 'lucide-react';
import { DetectedObject } from '../../types';

interface Props {
    stream: MediaStream | null;
    detections: DetectedObject[];
}

export const OfflineMode: React.FC<Props> = ({ stream, detections }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="absolute inset-0 bg-black flex flex-col overflow-hidden">
            {/* Safe Mode Header */}
            <div className="absolute top-28 left-0 w-full z-20 flex justify-center pointer-events-none">
                <div className="bg-emerald-900/80 backdrop-blur-md border border-emerald-500/50 px-6 py-2 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                     <WifiOff className="text-emerald-400" size={20} />
                     <span className="text-emerald-400 font-mono font-bold tracking-widest text-xs uppercase">NEURO_CORTEX :: OFFLINE_SAFE_MODE</span>
                     <Cpu className="text-emerald-400 animate-pulse" size={20} />
                </div>
            </div>

            {/* Video Feed (Grayscale for "Safe Mode" aesthetic) */}
            <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale contrast-125"
            />

            {/* Matrix Overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundSize: '20px 20px', backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)' }}></div>

            {/* Bounding Boxes */}
            {detections.map((obj, i) => {
                // Determine color based on class
                const isHazard = ['car', 'truck', 'bus', 'fire hydrant'].includes(obj.class);
                const color = isHazard ? '#FFD600' : '#00FF94';
                
                // Scale bbox to percentages roughly (Assuming full cover fit - this is approximate but effective for UI feedback)
                // Note: Real mapping requires canvas measurement, but for "effect" this works visually in many mobile aspects
                // A robust solution would map video-to-screen coords, but we'll use a centered approach or just listed HUD
                return null; // Drawing exact boxes on CSS `object-cover` video is complex. We'll use a HUD list instead.
            })}

            {/* HUD Detection List (Easier than pixel-perfect overlay on object-cover) */}
            <div className="absolute bottom-40 left-4 right-4 z-20 flex flex-wrap gap-2 justify-center pointer-events-none">
                {detections.map((obj, i) => (
                    <div key={i + obj.class} className={`px-4 py-2 rounded border-2 font-mono font-bold uppercase text-sm flex items-center gap-2 backdrop-blur-sm ${['car','truck'].includes(obj.class) ? 'bg-yellow-900/50 border-yellow-500 text-yellow-500' : 'bg-emerald-900/50 border-emerald-500 text-emerald-500'}`}>
                        {['car','truck'].includes(obj.class) ? '⚠️' : '👁️'} {obj.class} {Math.round(obj.score * 100)}%
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="absolute bottom-10 w-full text-center z-20 pointer-events-none">
                <div className="flex items-center justify-center gap-2 text-emerald-600/50 text-xs font-mono">
                    <ShieldCheck size={12} />
                    SYSTEM_INTEGRITY: 100% // LOCAL_MODELS_ACTIVE
                </div>
            </div>
        </div>
    );
};