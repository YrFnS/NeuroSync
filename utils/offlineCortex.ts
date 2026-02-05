import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { DetectedObject } from '../types';

class OfflineCortex {
    private model: cocoSsd.ObjectDetection | null = null;
    private isLoaded: boolean = false;
    private isLoading: boolean = false;

    public async load() {
        if (this.isLoaded || this.isLoading) return;
        
        try {
            this.isLoading = true;
            await tf.ready();
            // Load COCO-SSD lite for mobile performance
            this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
            this.isLoaded = true;
            console.log("Offline Cortex (TensorFlow) Loaded");
        } catch (err) {
            console.error("Failed to load Offline Cortex:", err);
        } finally {
            this.isLoading = false;
        }
    }

    public async detect(video: HTMLVideoElement): Promise<DetectedObject[]> {
        if (!this.model || !this.isLoaded) return [];

        try {
            const predictions = await this.model.detect(video);
            return predictions.map(p => ({
                class: p.class,
                score: p.score,
                bbox: p.bbox
            }));
        } catch (e) {
            // Frame might not be ready
            return [];
        }
    }

    public isReady() {
        return this.isLoaded;
    }
}

export const offlineCortex = new OfflineCortex();