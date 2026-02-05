import React from 'react';
import { NeuroState } from '../../types';

export const ScanningMode: React.FC<{ data: NeuroState['scanData'] }> = ({ data }) => {
  return (
    <div className="flex flex-col h-full w-full bg-neuro-bg text-neuro-text relative overflow-hidden">
      
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#FFD600 1px, transparent 1px), linear-gradient(90deg, #FFD600 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Top Label */}
      <div className="mb-4 text-center relative z-20">
        <span className="bg-[#0047AB] text-white px-6 py-2 rounded-full text-xl font-bold uppercase tracking-widest border-2 border-white shadow-[0_0_20px_#0047AB]">
          Scanner Active
        </span>
      </div>

      {/* High Visibility Viewfinder */}
      <div className="flex-1 relative border-[4px] md:border-[8px] border-neuro-text/20 rounded-3xl flex items-center justify-center overflow-hidden bg-neuro-ui/30 mx-2 z-10">
         
         {/* Active Laser Scanline */}
         <div className="absolute top-0 left-0 w-full h-1 bg-[#FFD600] shadow-[0_0_30px_#FFD600] z-0 animate-[scan_2s_linear_infinite]"></div>

         {/* Corner Markers */}
         <div className="absolute top-4 left-4 w-16 h-16 border-t-[8px] border-l-[8px] border-[#FFD600] rounded-tl-lg"></div>
         <div className="absolute top-4 right-4 w-16 h-16 border-t-[8px] border-r-[8px] border-[#FFD600] rounded-tr-lg"></div>
         <div className="absolute bottom-4 left-4 w-16 h-16 border-b-[8px] border-l-[8px] border-[#FFD600] rounded-bl-lg"></div>
         <div className="absolute bottom-4 right-4 w-16 h-16 border-b-[8px] border-r-[8px] border-[#FFD600] rounded-br-lg"></div>
         
         {/* Center Crosshair */}
         <div className="absolute w-8 h-8 flex items-center justify-center opacity-70">
            <div className="w-full h-1 bg-[#FFD600]"></div>
            <div className="h-full w-1 bg-[#FFD600] absolute"></div>
         </div>
         
         {!data ? (
            <div className="flex flex-col items-center z-10">
                <p className="text-3xl font-mono font-bold animate-pulse text-[#FFD600]">ACQUIRING TARGET...</p>
                <div className="mt-4 flex gap-2">
                   <div className="w-2 h-2 bg-[#FFD600] animate-bounce"></div>
                   <div className="w-2 h-2 bg-[#FFD600] animate-bounce delay-100"></div>
                   <div className="w-2 h-2 bg-[#FFD600] animate-bounce delay-200"></div>
                </div>
            </div>
         ) : (
             <div className="text-center p-6 bg-black/80 backdrop-blur-xl w-[90%] rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center justify-center z-20 animate-in zoom-in duration-300">
                <div className="text-xs font-mono text-gray-400 mb-2 tracking-widest">OBJECT IDENTIFIED</div>
                <h1 className="text-4xl md:text-5xl font-black mb-4 uppercase leading-tight text-white">{data.objectName}</h1>
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD600] to-transparent mb-4"></div>
                <p className="text-xl md:text-2xl font-bold text-[#FFD600] leading-snug">{data.details}</p>
             </div>
         )}

         {/* Side Data Decorations */}
         <div className="absolute right-2 top-1/4 flex flex-col gap-1 opacity-50">
             {Array.from({length: 10}).map((_, i) => (
                 <div key={i} className="w-1 h-4 bg-white/20"></div>
             ))}
         </div>
      </div>

      {/* Footer Instructions */}
      <div className="mt-4 text-center z-20 pb-4">
          <p className="opacity-50 font-bold text-lg md:text-xl font-mono">ALIGN // HOLD STEADY</p>
      </div>
      
      <style>{`
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};