
import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION, TOOLS } from '../constants';
import { AppMode } from '../types';
import { soundEngine } from '../utils/soundEngine';

// High-performance direct buffer conversion
function floatTo16BitPCMBase64(float32: Float32Array): string {
  const len = float32.length;
  const int16 = new Int16Array(len);
  
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const l = bytes.byteLength;
  for (let i = 0; i < l; i += 32768) { 
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 32768, l)) as unknown as number[]);
  }
  return btoa(binary);
}

// Helper to decode audio
async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

interface UseLiveSessionProps {
  onToolCall: (name: string, args: any) => Promise<any>;
  onTranscript: (text: string, isUser: boolean) => void;
  apiKey?: string;
  mode: AppMode;
  location?: { lat: number; lng: number } | null;
  videoStream: MediaStream | null; // Now accepts external stream
}

export const useLiveSession = ({ onToolCall, onTranscript, apiKey, mode, location, videoStream }: UseLiveSessionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const sessionRef = useRef<Promise<any> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoIntervalRef = useRef<number | null>(null);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const getSnapshot = useCallback((): string | undefined => {
      if (!canvasRef.current || !videoRef.current) return undefined;
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          return canvasRef.current.toDataURL('image/jpeg', 0.6);
      }
      return undefined;
  }, []);

  // ADAPTIVE VISION LOOP
  useEffect(() => {
    if (!isConnected || !isStreaming || !sessionRef.current || !videoRef.current || !canvasRef.current) return;

    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);

    let intervalMs = 2000; 
    switch (mode) {
        case AppMode.DANGER:
        case AppMode.NAVIGATION: intervalMs = 200; break;
        case AppMode.READING:
        case AppMode.SCANNING: intervalMs = 500; break;
        default: intervalMs = 2000; break;
    }

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    const videoEl = videoRef.current;
    const sessionPromise = sessionRef.current;
    const canvas = canvasRef.current;

    videoIntervalRef.current = window.setInterval(async () => {
        if (!ctx || !videoEl) return;
        if (videoEl.readyState >= 2) {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
            try {
                const session = await sessionPromise;
                session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64 } });
            } catch (err) { console.error("Frame send error:", err); }
        }
    }, intervalMs);

    return () => {
        if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    };
  }, [mode, isConnected, isStreaming]);

  // Connect to Gemini
  const connect = useCallback(async () => {
    setError(null);
    const key = apiKey || process.env.API_KEY;
    if (!key) { setError("API Key Missing"); return; }
    if (!videoStream) { setError("Camera not ready"); return; }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await audioContext.resume();
      audioContextRef.current = audioContext;

      const ai = new GoogleGenAI({ apiKey: key });
      
      const now = new Date();
      let locString = "Unknown";
      if (locationRef.current) {
          locString = `${locationRef.current.lat.toFixed(5)}, ${locationRef.current.lng.toFixed(5)}`;
      }
      
      const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}
Context: ${now.toLocaleTimeString()}, Location: ${locString}`;

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          systemInstruction: dynamicSystemInstruction,
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: { model: "gemini-2.5-flash" },
          outputAudioTranscription: { model: "gemini-2.5-flash" },
          tools: [{ functionDeclarations: TOOLS }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Connected");
            setIsConnected(true);
            setIsStreaming(true);

            // Audio Input Handling using existing stream
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(videoStream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               const base64Data = floatTo16BitPCMBase64(inputData);
               sessionPromise.then(session => {
                  session.sendRealtimeInput({
                      media: { mimeType: 'audio/pcm;rate=16000', data: base64Data }
                  });
               });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.inputTranscription?.text) onTranscript(msg.serverContent.inputTranscription.text, true);
            if (msg.serverContent?.outputTranscription?.text) onTranscript(msg.serverContent.outputTranscription.text, false);

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
                soundEngine.duck();
                const ctx = audioContextRef.current;
                const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                const start = Math.max(ctx.currentTime, nextStartTimeRef.current);
                source.start(start);
                nextStartTimeRef.current = start + buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) setTimeout(() => soundEngine.unduck(), 200);
                };
            }

            if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                soundEngine.unduck();
            }

            if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                    const result = await onToolCall(fc.name, fc.args);
                    sessionPromise.then(session => {
                        session.sendToolResponse({
                            functionResponses: { id: fc.id, name: fc.name, response: { result: result } }
                        })
                    })
                }
            }
          },
          onclose: () => {
             console.log("Gemini Closed");
             setIsConnected(false);
             setIsStreaming(false);
             soundEngine.unduck();
          },
          onerror: (err) => {
            console.error("Gemini Error", err);
            setIsConnected(false);
            setError("Connection Error");
            soundEngine.unduck();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

      // Attach existing stream to internal video element for processing
      const videoEl = document.createElement('video');
      videoEl.srcObject = videoStream;
      videoEl.muted = true;
      videoEl.play();
      videoRef.current = videoEl;

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      canvasRef.current = canvas;

    } catch (e: any) {
      console.error("Connection failed", e);
      setError(e.message || "Connection Error");
    }
  }, [onToolCall, apiKey, videoStream]);

  const disconnect = useCallback(() => {
    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }
    
    // We DO NOT stop the videoStream tracks here because useCamera owns them now.
    
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    
    // Reset state but don't reload page
    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  return { connect, disconnect, isConnected, isStreaming, error, getSnapshot };
};
