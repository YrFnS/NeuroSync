import { useEffect, useRef, useState, useCallback } from "react";
import { GoogleGenAI, type LiveServerMessage, Modality } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION, TOOLS } from "../constants";
import { AppMode } from "../types";
import { soundEngine } from "../utils/soundEngine";

// AudioWorklet Processor Code (Embedded to avoid extra file complexity)
const WORKLET_CODE = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channel = input[0];
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.index++] = channel[i];
        if (this.index >= this.bufferSize) {
          this.port.postMessage(this.buffer);
          this.index = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('recorder-processor', RecorderProcessor);
`;

// Optimized buffer conversion
function floatTo16BitPCMBase64(float32: Float32Array): string {
	const len = float32.length;
	const int16 = new Int16Array(len);

	for (let i = 0; i < len; i++) {
		const s = Math.max(-1, Math.min(1, float32[i]));
		int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
	}

	// Use a more memory-efficient string building approach
	let binary = "";
	const bytes = new Uint8Array(int16.buffer);
	const l = bytes.byteLength;
	// Process in chunks to avoid stack overflow on large arrays
	const CHUNK_SIZE = 0x8000;
	for (let i = 0; i < l; i += CHUNK_SIZE) {
		binary += String.fromCharCode.apply(
			null,
			bytes.subarray(i, Math.min(i + CHUNK_SIZE, l)) as unknown as number[],
		);
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
	videoStream: MediaStream | null;
}

export const useLiveSession = ({
	onToolCall,
	onTranscript,
	apiKey,
	mode,
	location,
	videoStream,
}: UseLiveSessionProps) => {
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
	const requestRef = useRef<number | null>(null);
	const lastVideoFrameTime = useRef<number>(0);
	const locationRef = useRef(location);

	useEffect(() => {
		locationRef.current = location;
	}, [location]);

	// Optimized snapshot getter
	const getSnapshot = useCallback((): string | undefined => {
		if (!canvasRef.current || !videoRef.current) return undefined;
		// 'willReadFrequently' forces CPU rendering which is faster for frequent readbacks
		const ctx = canvasRef.current.getContext("2d", {
			willReadFrequently: true,
		});
		if (ctx) {
			ctx.drawImage(
				videoRef.current,
				0,
				0,
				canvasRef.current.width,
				canvasRef.current.height,
			);
			return canvasRef.current.toDataURL("image/jpeg", 0.5);
		}
		return undefined;
	}, []);

	// ADAPTIVE VISION LOOP
	useEffect(() => {
		if (
			!isConnected ||
			!isStreaming ||
			!sessionRef.current ||
			!videoRef.current ||
			!canvasRef.current
		) {
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
			return;
		}

		const processFrame = async () => {
			// Stop loop if disconnected
			if (!isConnected || !isStreaming) return;

			// Smart Throttling: Check visibility and mode
			const isHidden = document.hidden;
			const now = Date.now();

			let intervalMs = 1000;
			if (isHidden) {
				intervalMs = 5000; // Very slow background processing
			} else {
				switch (mode) {
					case AppMode.DANGER:
					case AppMode.NAVIGATION:
						intervalMs = 250;
						break; // 4 FPS
					case AppMode.READING:
					case AppMode.SCANNING:
						intervalMs = 500;
						break; // 2 FPS
					default:
						intervalMs = 1500;
						break; // ~0.7 FPS for Idle
				}
			}

			if (now - lastVideoFrameTime.current >= intervalMs) {
				lastVideoFrameTime.current = now;

				const videoEl = videoRef.current;
				const canvas = canvasRef.current;

				if (videoEl && canvas && videoEl.readyState >= 2) {
					const ctx = canvas.getContext("2d", { willReadFrequently: true });
					if (ctx) {
						ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
						// Use lower quality (0.35) for speed. It's sufficient for AI.
						const base64 = canvas.toDataURL("image/jpeg", 0.35).split(",")[1];
						try {
							const session = await sessionRef.current;
							if (session) {
								session.sendRealtimeInput({
									media: { mimeType: "image/jpeg", data: base64 },
								});
							}
						} catch (err) {
							console.warn("Frame drop:", err);
						}
					}
				}
			}

			requestRef.current = requestAnimationFrame(processFrame);
		};

		requestRef.current = requestAnimationFrame(processFrame);

		return () => {
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
		};
	}, [mode, isConnected, isStreaming]);

	// Connect to Gemini
	const connect = useCallback(async () => {
		setError(null);
		const key = apiKey;
		if (!key) {
			setError("API Key Missing");
			return;
		}
		if (!videoStream) {
			setError("Camera not ready");
			return;
		}

		try {
			// Reuse existing context if available
			let audioContext = audioContextRef.current;
			if (!audioContext || audioContext.state === "closed") {
				audioContext = new (
					window.AudioContext || (window as any).webkitAudioContext
				)({ sampleRate: 24000 });
				audioContextRef.current = audioContext;
			}
			if (audioContext.state === "suspended") await audioContext.resume();

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
					inputAudioTranscription: {},
					outputAudioTranscription: {},
					tools: [{ functionDeclarations: TOOLS }],
					speechConfig: {
						voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
					},
				},
				callbacks: {
					onopen: async () => {
						console.log("Gemini Connected");
						setIsConnected(true);
						setIsStreaming(true);

						// Audio Input: Switch to AudioWorklet for performance
						try {
							const inputCtx = new (
								window.AudioContext || (window as any).webkitAudioContext
							)({ sampleRate: 16000 });
							const blob = new Blob([WORKLET_CODE], {
								type: "application/javascript",
							});
							const blobUrl = URL.createObjectURL(blob);

							await inputCtx.audioWorklet.addModule(blobUrl);

							const source = inputCtx.createMediaStreamSource(videoStream);
							const worklet = new AudioWorkletNode(
								inputCtx,
								"recorder-processor",
							);

							worklet.port.onmessage = (e) => {
								const inputData = e.data; // Float32Array from Worklet
								const base64Data = floatTo16BitPCMBase64(inputData);
								sessionPromise.then((session) => {
									session.sendRealtimeInput({
										media: {
											mimeType: "audio/pcm;rate=16000",
											data: base64Data,
										},
									});
								});
							};

							source.connect(worklet);
							worklet.connect(inputCtx.destination);
						} catch (err) {
							console.error(
								"AudioWorklet failed, falling back implies silence for now.",
								err,
							);
						}
					},
					onmessage: async (msg: LiveServerMessage) => {
						if (msg.serverContent?.inputTranscription?.text)
							onTranscript(msg.serverContent.inputTranscription.text, true);
						if (msg.serverContent?.outputTranscription?.text)
							onTranscript(msg.serverContent.outputTranscription.text, false);

						const audioData =
							msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
						if (audioData && audioContextRef.current) {
							soundEngine.duck();
							const ctx = audioContextRef.current;
							const buffer = await decodeAudioData(
								decode(audioData),
								ctx,
								24000,
								1,
							);
							const source = ctx.createBufferSource();
							source.buffer = buffer;
							source.connect(ctx.destination);
							const start = Math.max(ctx.currentTime, nextStartTimeRef.current);
							source.start(start);
							nextStartTimeRef.current = start + buffer.duration;
							sourcesRef.current.add(source);
							source.onended = () => {
								sourcesRef.current.delete(source);
								if (sourcesRef.current.size === 0)
									setTimeout(() => soundEngine.unduck(), 200);
							};
						}

						if (msg.serverContent?.interrupted) {
							sourcesRef.current.forEach((s) => s.stop());
							sourcesRef.current.clear();
							nextStartTimeRef.current = 0;
							soundEngine.unduck();
						}

						if (msg.toolCall) {
							for (const fc of msg.toolCall.functionCalls) {
								const result = await onToolCall(fc.name, fc.args);
								sessionPromise.then((session) => {
									session.sendToolResponse({
										functionResponses: {
											id: fc.id,
											name: fc.name,
											response: { result: result },
										},
									});
								});
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
					},
				},
			});

			sessionRef.current = sessionPromise;

			// Attach existing stream to internal video element for processing
			const videoEl = document.createElement("video");
			videoEl.srcObject = videoStream;
			videoEl.muted = true;
			videoEl.play();
			videoRef.current = videoEl;

			const canvas = document.createElement("canvas");
			canvas.width = 640;
			canvas.height = 480;
			canvasRef.current = canvas;
		} catch (e: any) {
			console.error("Connection failed", e);
			setError(e.message || "Connection Error");
		}
	}, [onToolCall, apiKey, videoStream]);

	const disconnect = useCallback(() => {
		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
			requestRef.current = null;
		}

		if (audioContextRef.current) {
			audioContextRef.current.close();
			audioContextRef.current = null;
		}

		setIsConnected(false);
		setIsStreaming(false);
	}, []);

	return { connect, disconnect, isConnected, isStreaming, error, getSnapshot };
};
