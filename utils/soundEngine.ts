// A pure Web Audio API synthesizer for sci-fi interface sounds
// Now with 3D Spatial Audio (Stereo Panning) & Native TTS

class SoundEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private panner: StereoPannerNode | null = null;
    private sonarInterval: number | null = null;
    private synth: SpeechSynthesis = window.speechSynthesis;
  
    constructor() {
      // Defer initialization
    }
  
    private init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Prevent ear blasting
        
        // Add Spatial Panner
        if (this.ctx.createStereoPanner) {
            this.panner = this.ctx.createStereoPanner();
            this.panner.pan.value = 0; // Center
            this.panner.connect(this.masterGain);
        } else {
            // Fallback for older browsers (though unlikely in modern PWA context)
        }
        
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume();
      }
    }

    /**
     * Speaks a system message using the device's native TTS.
     * This is distinct from the AI voice, used for system status.
     */
    public speakSystem(text: string) {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2; // Slightly faster for efficiency
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        this.synth.speak(utterance);
    }

    /**
     * Sets the spatial position of the audio.
     * @param panValue -1 (Left) to 1 (Right). 0 is Center.
     */
    public setPan(panValue: number) {
        this.init();
        if (this.panner) {
            // Smooth transition to avoid clicking
            this.panner.pan.setTargetAtTime(panValue, this.ctx!.currentTime, 0.1);
        }
    }
  
    public playModeSwitch() {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      // Reset pan to center for UI sounds
      this.setPan(0);
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      // Connect to panner if available, else master
      if (this.panner) {
        gain.connect(this.panner);
      } else {
        gain.connect(this.masterGain);
      }
  
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);
  
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
  
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    }
  
    public playDangerAlarm() {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      this.setPan(0); // Center alert
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      if (this.panner) gain.connect(this.panner);
      else gain.connect(this.masterGain);
  
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.1);
  
      gain.gain.setValueAtTime(1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
  
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    }
  
    public playSuccess() {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      this.setPan(0);
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      if (this.panner) gain.connect(this.panner);
      else gain.connect(this.masterGain);
  
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); 
      osc.frequency.setValueAtTime(1108, this.ctx.currentTime + 0.1); 
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
  
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    }
  
    // Starts a rhythmic clicking (Sonar) for navigation
    // Speed increases as distance decreases
    public startSonar(intensity: number = 0.5) {
      this.init();
      if (this.sonarInterval) clearInterval(this.sonarInterval);
  
      const intervalMs = Math.max(100, 1000 - (intensity * 900)); 
      
      this.sonarInterval = window.setInterval(() => {
        if (!this.ctx || !this.masterGain) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        // Important: Connect to panner so clicking moves with direction
        if (this.panner) gain.connect(this.panner);
        else gain.connect(this.masterGain);
  
        osc.frequency.setValueAtTime(2000, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
  
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      }, intervalMs);
    }
  
    public stopSonar() {
      if (this.sonarInterval) {
        clearInterval(this.sonarInterval);
        this.sonarInterval = null;
      }
    }
  }
  
  export const soundEngine = new SoundEngine();