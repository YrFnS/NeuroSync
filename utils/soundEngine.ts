// A pure Web Audio API synthesizer for sci-fi interface sounds
// Now with 3D Spatial Audio, Native TTS, and Audio Analysis

class SoundEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private panner: StereoPannerNode | null = null;
    private sonarInterval: number | null = null;
    private droneOsc: OscillatorNode | null = null;
    private droneGain: GainNode | null = null;
    private synth: SpeechSynthesis = window.speechSynthesis;
    private duckTimer: number | null = null;
  
    constructor() {
      // Defer initialization
    }
  
    public init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.3;
        
        if (this.ctx.createStereoPanner) {
            this.panner = this.ctx.createStereoPanner();
            this.panner.pan.value = 0;
            this.panner.connect(this.sfxGain);
        } else {
             // Fallback
        }
        
        this.sfxGain.connect(this.masterGain);
      }
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume();
      }
    }

    public getContext(): AudioContext | null {
        this.init();
        return this.ctx;
    }

    // Creates an analyser node from a media stream (for the Idle Visualizer)
    public createAnalyser(stream: MediaStream): AnalyserNode | null {
        this.init();
        if (!this.ctx) return null;
        
        const source = this.ctx.createMediaStreamSource(stream);
        const analyser = this.ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        // Do not connect to destination to avoid feedback loop
        return analyser;
    }

    public duck() {
        this.init();
        if (!this.sfxGain || !this.ctx) return;
        if (this.duckTimer) clearTimeout(this.duckTimer);
        this.sfxGain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.1);
        this.duckTimer = window.setTimeout(() => this.unduck(), 2000);
    }

    public unduck() {
        this.init();
        if (!this.sfxGain || !this.ctx) return;
        if (this.duckTimer) clearTimeout(this.duckTimer);
        this.sfxGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.5);
    }

    public speakSystem(text: string) {
        if (!this.synth) return;
        this.duck();

        if (this.synth.speaking) {
            this.synth.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2; 
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.onend = () => { this.unduck(); };
        this.synth.speak(utterance);
    }

    public setPan(panValue: number) {
        this.init();
        if (this.panner) {
            this.panner.pan.setTargetAtTime(panValue, this.ctx!.currentTime, 0.1);
        }
    }

    // Ambient Drone for "System Alive" feel
    public startDrone() {
        this.init();
        if (!this.ctx || !this.masterGain || this.droneOsc) return;

        this.droneOsc = this.ctx.createOscillator();
        this.droneGain = this.ctx.createGain();
        
        this.droneOsc.type = 'sine';
        this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A
        
        this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.droneGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 2); // Subtle

        this.droneOsc.connect(this.droneGain);
        this.droneGain.connect(this.masterGain);
        this.droneOsc.start();
    }

    public playCompassTick() {
        this.init();
        if (!this.ctx || !this.sfxGain) return;
        this.setPan(0);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);

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

    public playReset() {
        this.init();
        if (!this.ctx || !this.masterGain) return;

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
      if (!this.ctx || !this.masterGain) return; 
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