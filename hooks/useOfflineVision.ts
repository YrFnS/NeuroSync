import { useEffect, useRef } from 'react';
import { offlineCortex } from '../utils/offlineCortex';
import { DetectedObject, AppMode } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface Props {
    stream: MediaStream | null;
    isOffline: boolean;
    onDetections: (objects: DetectedObject[]) => void;
}

export const useOfflineVision = ({ stream, isOffline, onDetections }: Props) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const intervalRef = useRef<number | null>(null);
    const lastSpokenRef = useRef<number>(0);

    // Initialize Video Element for Analysis
    useEffect(() => {
        if (!stream) return;
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.play().catch(e => console.error("Offline video play error", e));
        videoRef.current = video;

        // Cleanup
        return () => {
            video.pause();
            video.srcObject = null;
        };
    }, [stream]);

    // Detection Loop
    useEffect(() => {
        if (!isOffline || !videoRef.current) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        // Ensure model is loaded
        offlineCortex.load();

        intervalRef.current = window.setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
                const objects = await offlineCortex.detect(videoRef.current);
                onDetections(objects);

                // Simple Offline Audio Cues
                const now = Date.now();
                if (now - lastSpokenRef.current > 4000) { // Throttle audio
                    const highConfidence = objects.filter(o => o.score > 0.6);
                    if (highConfidence.length > 0) {
                        // Prioritize Person or Hazards
                        const person = highConfidence.find(o => o.class === 'person');
                        const car = highConfidence.find(o => o.class === 'car' || o.class === 'truck');
                        
                        if (car) {
                             soundEngine.playDangerAlarm(); // Quick blip
                             soundEngine.speakSystem("Vehicle detected");
                             lastSpokenRef.current = now;
                        } else if (person) {
                             soundEngine.playCompassTick();
                             soundEngine.speakSystem("Person ahead");
                             lastSpokenRef.current = now;
                        } else {
                             // Generic
                             soundEngine.playCompassTick();
                             lastSpokenRef.current = now;
                        }
                    }
                }
            }
        }, 200); // Run at 5fps to save battery

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isOffline, stream, onDetections]);
};