import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION, TOOLS } from '../constants';
import { AppMode } from '../types';

// Helper for audio
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
}

export const useLiveSession = ({ onToolCall, onTranscript }: UseLiveSessionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Refs for cleanup and stability
  const sessionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Connect to Gemini
  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      console.error("No API Key found");
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // Start Camera & Mic
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }, 
        video: { 
          width: 640, 
          height: 480, 
          frameRate: 15 // Lower framerate for bandwidth
        } 
      });
      streamRef.current = mediaStream;

      // Connect session
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
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
               
               // Send Audio
               sessionPromise.then(session => {
                  // base64 encode
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64data = (reader.result as string).split(',')[1];
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64data
                        }
                    });
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
                const ctx = audioContextRef.current;
                const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                
                // Scheduling
                const now = ctx.currentTime;
                const start = Math.max(now, nextStartTimeRef.current);
                source.start(start);
                nextStartTimeRef.current = start + buffer.duration;
                
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Interruptions
            if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }

            // Handle Tools
            if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                    // CRITICAL UPDATE: Pass the actual result back to the model
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
             setIsConnected(false);
             setIsStreaming(false);
          },
          onerror: (err) => {
            console.error("Gemini Error", err);
            setIsConnected(false);
          }
        }
      });
      
      sessionRef.current = sessionPromise;

      // Video Loop
      const videoEl = document.createElement('video');
      videoEl.srcObject = mediaStream;
      videoEl.muted = true;
      videoEl.play();
      videoRef.current = videoEl;

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');

      const videoInterval = setInterval(async () => {
        if (!ctx || !videoEl) return;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        
        const session = await sessionPromise;
        session.sendRealtimeInput({
            media: {
                mimeType: 'image/jpeg',
                data: base64
            }
        });

      }, 1000); // 1 FPS for efficiency

      return () => {
         clearInterval(videoInterval);
      }

    } catch (e) {
      console.error("Connection failed", e);
    }
  }, [onToolCall]);

  const disconnect = () => {
    if (sessionRef.current) {
        window.location.reload(); 
    }
  };

  return { connect, disconnect, isConnected, isStreaming };
};