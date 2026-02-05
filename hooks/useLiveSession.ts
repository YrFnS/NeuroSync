import { useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION, TOOLS } from '../constants';

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
}

export const useLiveSession = ({ onToolCall, onTranscript, apiKey }: UseLiveSessionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // Refs for cleanup and stability
  const sessionRef = useRef<Promise<any> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoIntervalRef = useRef<number | null>(null);

  // Capture current frame as base64 JPEG
  const getSnapshot = useCallback((): string | undefined => {
      if (!canvasRef.current || !videoRef.current) return undefined;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          return canvasRef.current.toDataURL('image/jpeg', 0.6);
      }
      return undefined;
  }, []);

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
      
      // Start Camera & Mic
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }, 
        video: { 
          width: 640, 
          height: 480, 
          frameRate: 30
        } 
      });
      setVideoStream(mediaStream);

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
            inputAudioContextRef.current = inputCtx;
            
            const source = inputCtx.createMediaStreamSource(mediaStream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               const blob = createBlob(inputData);
               
               // Send Audio via FileReader
               sessionPromise.then(session => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const res = reader.result as string;
                    // Safety check for data URL format
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
                const ctx = audioContextRef.current;
                const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                
                const now = ctx.currentTime;
                // Schedule next chunk to ensure gapless playback
                const start = Math.max(now, nextStartTimeRef.current);
                source.start(start);
                nextStartTimeRef.current = start + buffer.duration;
                
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
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
          },
          onerror: (err) => {
            console.error("Gemini Error", err);
            setIsConnected(false);
            setError("Connection Error");
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

      // Increased sampling rate for "Danger Sense" (200ms = 5fps)
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      
      videoIntervalRef.current = window.setInterval(async () => {
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

      }, 200);

    } catch (e: any) {
      console.error("Connection failed", e);
      setError(e.message || "Permissions Denied");
    }
  }, [onToolCall, apiKey]);

  const disconnect = useCallback(() => {
    // Clean up intervals
    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }
    
    // Stop tracks
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
    }

    // Close Audio Contexts
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }

    // Reset state
    setIsConnected(false);
    setIsStreaming(false);
    sessionRef.current = null;
    
    // Optional: hard reload if deep cleanup is needed
    // window.location.reload(); 
  }, [videoStream]);

  return { connect, disconnect, isConnected, isStreaming, videoStream, error, getSnapshot };
};