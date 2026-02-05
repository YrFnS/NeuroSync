// A pure Web Audio API synthesizer for sci-fi interface sounds
// Now with 3D Spatial Audio (Stereo Panning) & Native TTS

class SoundEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sfxGain: GainNode | null = null; // Separate gain for SFX (Sonar/Beeps)
    private panner: StereoPannerNode | null = null;
    private sonarInterval: number | null = null;
    private synth: SpeechSynthesis = window.speechSynthesis;
    private duckTimer: NodeJS.Timeout | null = null;
  
    constructor() {
      // Defer initialization
    }
  
    private init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
        
        // Master Gain (Final Output)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);

        // SFX Gain (For Sonar/Beeps - This gets Ducked)
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.3; // Default SFX volume
        
        // Spatial Panner
        if (this.ctx.createStereoPanner) {
            this.panner = this.ctx.createStereoPanner();
            this.panner.pan.value = 0; // Center
            this.panner.connect(this.sfxGain);
        } else {
             // Fallback logic could go here
        }
        
        // Connect SFX chain to Master
        this.sfxGain.connect(this.masterGain);
      }
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume();
      }
    }

    /**
     * Lowers SFX volume temporarily while AI is speaking.
     */
    public duck() {
        this.init();
        if (!this.sfxGain || !this.ctx) return;
        
        // Cancel any pending unduck
        if (this.duckTimer) clearTimeout(this.duckTimer);

        // Ramp down immediately
        this.sfxGain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.1);

        // Auto unduck after 2 seconds if not called again (safety)
        this.duckTimer = setTimeout(() => this.unduck(), 2000);
    }

    /**
     * Restores SFX volume.
     */
    public unduck() {
        this.init();
        if (!this.sfxGain || !this.ctx) return;
        if (this.duckTimer) clearTimeout(this.duckTimer);
        
        // Ramp back up smoothly
        this.sfxGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.5);
    }

    public speakSystem(text: string) {
        if (!this.synth) return;
        
        // Duck SFX when system speaks
        this.duck();

        if (this.synth.speaking) {
            this.synth.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2; 
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onend = () => {
             this.unduck();
        };

        this.synth.speak(utterance);
    }

    public setPan(panValue: number) {
        this.init();
        if (this.panner) {
            this.panner.pan.setTargetAtTime(panValue, this.ctx!.currentTime, 0.1);
        }
    }

    public playCompassTick() {
        this.init();
        if (!this.ctx || !this.sfxGain) return;
        this.setPan(0);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain); // Connect to SFX bus

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }
  
    public playModeSwitch() {
      this.init();
      if (!this.ctx || !this.sfxGain) return;
      this.setPan(0);
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      if (this.panner) gain.connect(this.panner);
      else gain.connect(this.sfxGain);
  
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

    // "Glitch/Rewind" sound for Reset
    public playReset() {
        this.init();
        if (!this.ctx || !this.masterGain) return; // Master gain (bypass ducking for reset feedback)

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
  
    public playDangerAlarm() {
      this.init();
      if (!this.ctx || !this.masterGain) return; // Danger bypasses ducking
      this.setPan(0); 
  
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

    public playBatteryLow() {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      this.setPan(0);
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      if (this.panner) gain.connect(this.panner);
      else gain.connect(this.masterGain);
  
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.6);
  
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
  
      osc.start();
      osc.stop(this.ctx.currentTime + 0.6);
    }
  
    public playSuccess() {
      this.init();
      if (!this.ctx || !this.sfxGain) return;
      this.setPan(0);
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      if (this.panner) gain.connect(this.panner);
      else gain.connect(this.sfxGain);
  
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); 
      osc.frequency.setValueAtTime(1108, this.ctx.currentTime + 0.1); 
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
  
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    }
  
    public startSonar(intensity: number = 0.5) {
      this.init();
      if (this.sonarInterval) clearInterval(this.sonarInterval);
  
      const intervalMs = Math.max(100, 1000 - (intensity * 900)); 
      
      this.sonarInterval = window.setInterval(() => {
        if (!this.ctx || !this.sfxGain) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        if (this.panner) gain.connect(this.panner);
        else gain.connect(this.sfxGain);
  
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