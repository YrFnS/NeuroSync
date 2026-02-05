import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION, TOOLS } from '../constants';
import { AppMode } from '../types';
import { soundEngine } from '../utils/soundEngine';

// Helper for audio blob creation
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return new Blob([new Uint8Array(int16.buffer)], { type: 'audio/pcm' });
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

// Helper: base64 decoder
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
  onTranscript: (text: string) => void;
  apiKey?: string;
  mode: AppMode;
  location?: { lat: number; lng: number } | null;
}

export const useLiveSession = ({ onToolCall, onTranscript, apiKey, mode, location }: UseLiveSessionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // Refs
  const sessionRef = useRef<Promise<any> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoIntervalRef = useRef<number | null>(null);
  const locationRef = useRef(location);

  // Keep location ref updated for the connection event
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const getSnapshot = useCallback((): string | undefined => {
      if (!canvasRef.current || !videoRef.current) return undefined;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          return canvasRef.current.toDataURL('image/jpeg', 0.6);
      }
      return undefined;
  }, []);

  // ADAPTIVE VISION LOOP
  useEffect(() => {
    if (!isConnected || !isStreaming || !sessionRef.current || !videoRef.current || !canvasRef.current) return;

    // Clear any existing loop to prevent duplicates
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);

    // Determine FPS based on Mode
    let intervalMs = 2000; // Default IDLE (0.5 FPS)
    
    switch (mode) {
        case AppMode.DANGER:
        case AppMode.NAVIGATION:
            intervalMs = 200; // 5 FPS (High Alert)
            break;
        case AppMode.READING:
        case AppMode.SCANNING:
            intervalMs = 500; // 2 FPS (High Detail)
            break;
        case AppMode.GUARDIAN:
        case AppMode.IDLE:
        default:
            intervalMs = 2000; // 0.5 FPS (Battery Saver)
            break;
    }

    const ctx = canvasRef.current.getContext('2d');
    const videoEl = videoRef.current;
    const sessionPromise = sessionRef.current;

    videoIntervalRef.current = window.setInterval(async () => {
        if (!ctx || !videoEl) return;
        
        ctx.drawImage(videoEl, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
        
        // JPEG compression 0.5 is a good balance for speed/quality
        const base64 = canvasRef.current!.toDataURL('image/jpeg', 0.5).split(',')[1];
        
        try {
            const session = await sessionPromise;
            session.sendRealtimeInput({
                media: {
                    mimeType: 'image/jpeg',
                    data: base64
                }
            });
        } catch (err) {
            console.error("Frame send error:", err);
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
    if (!key) {
      setError("API Key Missing");
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await audioContext.resume();
      audioContextRef.current = audioContext;

      const ai = new GoogleGenAI({ apiKey: key });
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }, 
        video: { 
          width: 640, 
          height: 480, 
          frameRate: 30
        } 
      });
      setVideoStream(mediaStream);

      // PREPARE CONTEXT BEFORE CONNECTING
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      const dateString = now.toLocaleDateString();
      let locString = "Unknown";
      if (locationRef.current) {
          locString = `${locationRef.current.lat.toFixed(5)}, ${locationRef.current.lng.toFixed(5)}`;
      }
      
      const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}

**CURRENT SYSTEM CONTEXT**
Timestamp: ${dateString} ${timeString}
User Location (GPS): ${locString}
Visibility: Conditions may vary. Rely on audio cues if video is dark.`;

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          systemInstruction: dynamicSystemInstruction,
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: TOOLS }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Connected");
            setIsConnected(true);
            setIsStreaming(true);

            // Audio Input Handling
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(mediaStream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               const blob = createBlob(inputData);
               
               sessionPromise.then(session => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const res = reader.result as string;
                    if (res && res.includes(',')) {
                        const base64data = res.split(',')[1];
                        session.sendRealtimeInput({
                            media: {
                                mimeType: 'audio/pcm;rate=16000',
                                data: base64data
                            }
                        });
                    }
                  };
                  reader.readAsDataURL(blob);
               });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
                // *** AUDIO DUCKING ***
                // Lower UI volume when AI speaks
                soundEngine.duck();

                const ctx = audioContextRef.current;
                const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                
                const now = ctx.currentTime;
                const start = Math.max(now, nextStartTimeRef.current);
                source.start(start);
                nextStartTimeRef.current = start + buffer.duration;
                
                sourcesRef.current.add(source);
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    // Unduck if no more audio playing
                    if (sourcesRef.current.size === 0) {
                        setTimeout(() => soundEngine.unduck(), 200);
                    }
                };
            }

            if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                soundEngine.unduck(); // Unduck immediately on interrupt
            }

            if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                    const result = await onToolCall(fc.name, fc.args);
                    sessionPromise.then(session => {
                        session.sendToolResponse({
                            functionResponses: {
                                id: fc.id,
                                name: fc.name,
                                response: { result: result } 
                            }
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

      const videoEl = document.createElement('video');
      videoEl.srcObject = mediaStream;
      videoEl.muted = true;
      videoEl.play();
      videoRef.current = videoEl;

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      canvasRef.current = canvas;

    } catch (e: any) {
      console.error("Connection failed", e);
      setError(e.message || "Permissions Denied");
    }
  }, [onToolCall, apiKey]);

  const disconnect = useCallback(() => {
    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
    }

    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }

    window.location.reload(); 
  }, [videoStream]);

  return { connect, disconnect, isConnected, isStreaming, videoStream, error, getSnapshot };
};