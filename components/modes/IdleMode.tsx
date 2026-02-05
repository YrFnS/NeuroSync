import React, { useEffect, useRef } from 'react';
import { Radio } from 'lucide-react';
import { soundEngine } from '../../utils/soundEngine';

interface Props {
    audioStream: MediaStream | null;
}

export const IdleMode: React.FC<Props> = ({ audioStream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioStream) return;
    
    // Connect stream to analyser
    analyserRef.current = soundEngine.createAnalyser(audioStream);

    const render = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const analyser = analyserRef.current;
        
        if (canvas && ctx && analyser) {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;

            ctx.clearRect(0, 0, w, h);
            
            // Draw "Neuro-Core"
            // Base Circle
            ctx.beginPath();
            const baseRadius = Math.min(w, h) * 0.25;
            
            // Average volume for pulsing
            let sum = 0;
            for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const avg = sum / bufferLength;
            const pulse = 1 + (avg / 255) * 0.5;

            // Draw Wireframe Sphere
            ctx.strokeStyle = '#00FF94'; // Signal Green
            ctx.lineWidth = 2;
            
            // Generate distorted circle based on frequency
            ctx.beginPath();
            for (let i = 0; i <= 360; i += 5) {
                const angle = (i * Math.PI) / 180;
                // Map angle to frequency index roughly
                const idx = Math.floor((i / 360) * bufferLength);
                const val = dataArray[idx] || 0;
                const r = baseRadius * pulse + (val * 0.5);
                
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            // Inner Core (Secondary Frequency)
            ctx.beginPath();
            ctx.strokeStyle = '#FFD600'; // Safety Yellow
            for (let i = 0; i <= 360; i += 10) {
                const angle = -(i * Math.PI) / 180; // Reverse spin
                const idx = Math.floor(((i + 50) % 360 / 360) * bufferLength);
                const val = dataArray[idx] || 0;
                const r = (baseRadius * 0.6) * pulse + (val * 0.2);
                
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            // Connecting lines (Synapses)
            if (avg > 10) {
                ctx.strokeStyle = `rgba(0, 255, 148, ${avg/255})`;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                const maxValIdx = dataArray.indexOf(Math.max(...dataArray));
                const angle = (maxValIdx / bufferLength) * Math.PI * 2;
                const r = baseRadius * 1.5;
                ctx.lineTo(cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
                ctx.stroke();
            }
        }
        animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audioStream]);

  // Handle Resize
  useEffect(() => {
     const handleResize = () => {
         if (canvasRef.current) {
             canvasRef.current.width = window.innerWidth;
             canvasRef.current.height = window.innerHeight;
         }
     };
     window.addEventListener('resize', handleResize);
     handleResize();
     return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-80" />
      
      <div className="relative z-10 text-center pointer-events-none mix-blend-difference">
         <h1 className="text-[12vw] font-black tracking-tighter text-white opacity-90 leading-none">NEURO<br/>SYNC</h1>
         <div className="flex items-center justify-center gap-2 mt-4">
             <Radio className="text-white animate-pulse" size={16} />
             <span className="font-mono text-sm tracking-[0.2em] text-white">LISTENING...</span>
         </div>
      </div>
    </div>
  );
};