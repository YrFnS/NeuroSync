// A pure Web Audio API synthesizer for sci-fi interface sounds
// Now with 3D Spatial Audio (HRTF), Native TTS, and Audio Analysis

class SoundEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private panner: PannerNode | null = null; // Upgraded to 3D Panner
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
        
        // 3D Spatial Audio Setup
        this.panner = this.ctx.createPanner();
        this.panner.panningModel = 'HRTF'; // High-quality binaural rendering
        this.panner.distanceModel = 'inverse';
        this.panner.refDistance = 1;
        this.panner.maxDistance = 10000;
        this.panner.rolloffFactor = 1;
        
        // Connect Panner to SFX Gain
        this.panner.connect(this.sfxGain);
        this.sfxGain.connect(this.masterGain);

        // Ensure listener is facing forward (standard Cartesian)
        if (this.ctx.listener.forwardX) {
            this.ctx.listener.forwardX.value = 0;
            this.ctx.listener.forwardY.value = 0;
            this.ctx.listener.forwardZ.value = -1;
            this.ctx.listener.upX.value = 0;
            this.ctx.listener.upY.value = 1;
            this.ctx.listener.upZ.value = 0;
        }
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

    /**
     * Positions the sound source relative to the user.
     * @param azimuthDeg Angle in degrees. 0=Front, -90=Left, 90=Right, 180=Behind.
     * @param distance Meters from user.
     */
    public setAzimuth(azimuthDeg: number, distance: number = 2) {
        this.init();
        if (!this.panner || !this.ctx) return;
        
        // Convert Degrees to Radians
        // Web Audio Coord System: +X Right, +Y Up, -Z Forward
        const rad = (azimuthDeg * Math.PI) / 180;
        const x = Math.sin(rad) * distance;
        const z = -Math.cos(rad) * distance;
        
        const t = this.ctx.currentTime;
        // Smooth transition to new position
        this.panner.positionX.setTargetAtTime(x, t, 0.1);
        this.panner.positionZ.setTargetAtTime(z, t, 0.1);
        this.panner.positionY.setTargetAtTime(0, t, 0.1); // Eye level
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
        this.setAzimuth(0, 1); // Center tick

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain); // Route through panner via sfxGain connection logic? 
        // Note: Earlier structure connected panner to sfxGain. 
        // We need to connect the osc -> gain -> panner.
        // Let's fix the routing for momentary SFX.
        
        // Re-routing for dynamic panner usage
        gain.disconnect();
        if (this.panner) gain.connect(this.panner); 
        else gain.connect(this.sfxGain);

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
      this.setAzimuth(0, 1);
  
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
        // Reset sound bypasses panner, goes to master
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
      this.setAzimuth(0, 0.5); // Close and Center
  
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
      this.setAzimuth(0, 1);
  
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
      this.setAzimuth(0, 1);
  
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