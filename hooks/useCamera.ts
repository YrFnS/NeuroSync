import { useState, useEffect } from 'react';

export const useCamera = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        let activeStream: MediaStream | null = null;

        const initCamera = async () => {
            try {
                // 1. Try Preferred Config (Back Camera, optimized for mobile)
                // This often fails on desktops or laptops lacking a rear camera ('environment')
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        channelCount: 1,
                        sampleRate: 16000,
                        echoCancellation: true,
                        noiseSuppression: true,
                    }, 
                    video: { 
                        facingMode: "environment",
                        width: { ideal: 640 }, 
                        height: { ideal: 480 }, 
                        frameRate: { ideal: 30 } 
                    } 
                });
                
                if (mounted) {
                    activeStream = mediaStream;
                    setStream(mediaStream);
                } else {
                    mediaStream.getTracks().forEach(track => track.stop());
                }
                return;
            } catch (e) {
                console.warn("Preferred camera config failed. Attempting fallback.", e);
            }

            // 2. Try Fallback Config (Relaxed constraints)
            if (mounted) {
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                        }, 
                        video: true 
                    });
                    
                    if (mounted) {
                        activeStream = fallbackStream;
                        setStream(fallbackStream);
                        // Clear error if fallback succeeds
                        setError(null);
                    } else {
                        fallbackStream.getTracks().forEach(track => track.stop());
                    }
                } catch (e: any) {
                    if (mounted) {
                        console.error("Camera access failed completely:", e);
                        setError(e.message || "Camera blocked or unavailable");
                    }
                }
            }
        };

        initCamera();

        return () => {
            mounted = false;
            // Note: In strict mode dev, this cleans up the first stream to prevent "Device in use" errors
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return { stream, error };
};