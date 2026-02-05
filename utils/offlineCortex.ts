
import { DetectedObject } from '../types';

// We do NOT import TensorFlow here. 
// We dynamically import it only when needed to save MBs of initial load time.

class OfflineCortex {
    private model: any = null; // Type any to avoid importing types that might trigger bundling
    private isLoaded: boolean = false;
    private isLoading: boolean = false;

    public async load() {
        if (this.isLoaded || this.isLoading) return;
        
        try {
            this.isLoading = true;
            
            // Dynamic Import: This splits the code chunk. 
            // The browser will only download TensorFlow when this line runs.
            const tf = await import('@tensorflow/tfjs');
            const cocoSsd = await import('@tensorflow-models/coco-ssd');

            await tf.ready();
            // Load COCO-SSD lite for mobile performance
            this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
            this.isLoaded = true;
            console.log("Offline Cortex (TensorFlow) Loaded via Code Splitting");
        } catch (err) {
            console.error("Failed to load Offline Cortex:", err);
        } finally {
            this.isLoading = false;
        }
    }

    public async detect(video: HTMLVideoElement): Promise<DetectedObject[]> {
        if (!this.model || !this.isLoaded) return [];

        try {
            // Ensure video has data before asking TF to look at it
            if (video.readyState < 2) return [];

            const predictions = await this.model.detect(video);
            return predictions.map((p: any) => ({
                class: p.class,
                score: p.score,
                bbox: p.bbox
            }));
        } catch (e) {
            return [];
        }
    }

    public isReady() {
        return this.isLoaded;
    }
}

export const offlineCortex = new OfflineCortex();
