// A pure Web Audio API synthesizer for sci-fi interface sounds
// No external MP3s required.

class SoundEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sonarInterval: number | null = null;
  
    constructor() {
      // Initialize on first user interaction to handle autoplay policies
      if (typeof window !== 'undefined') {
        // We defer initialization until the first interaction usually, 
        // but for this demo we'll try to init lazily
      }
    }
  
    private init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Prevent ear blasting
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume();
      }
    }
  
    // Plays a futuristic "Mode Switch" sound
    public playModeSwitch() {
      this.init();
      if (!this.ctx || !this.masterGain) return;
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);
  
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
  
    // Plays a harsh "Danger" alarm
    public playDangerAlarm() {
      this.init();
      if (!this.ctx || !this.masterGain) return;
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);
  
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.1);
  
      gain.gain.setValueAtTime(1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
  
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    }
  
    // Plays a pleasant "Success/Found" chime
    public playSuccess() {
      this.init();
      if (!this.ctx || !this.masterGain) return;
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);
  
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1108, this.ctx.currentTime + 0.1); // C#6
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
  
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    }
  
    // Starts a rhythmic clicking (Sonar) for navigation
    // Speed increases as distance decreases (simulated by passing 'intensity' 0-1)
    public startSonar(intensity: number = 0.5) {
      this.init();
      if (this.sonarInterval) clearInterval(this.sonarInterval);
  
      const intervalMs = Math.max(100, 1000 - (intensity * 900)); // 1000ms (slow) to 100ms (fast)
      
      this.sonarInterval = window.setInterval(() => {
        if (!this.ctx || !this.masterGain) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
  
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