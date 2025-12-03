// Advanced Sci-Fi Synth using Web Audio API
export class AudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Audio context not supported");
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Sci-Fi Charge Up Sound (for aggregation)
  playConverge() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // FM Synthesis setup
    osc.type = 'sawtooth';
    mod.type = 'sine';
    
    // Carrier frequency sweeps up
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 1.5);

    // Modulator config
    mod.frequency.setValueAtTime(20, t);
    mod.frequency.linearRampToValueAtTime(100, t + 1.5);
    modGain.gain.setValueAtTime(100, t);
    modGain.gain.linearRampToValueAtTime(500, t + 1.5);

    // Filter opening up
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(2000, t + 1.5);

    // Envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.5);
    gain.gain.setValueAtTime(0.3, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 2.0);

    // Routing: Mod -> ModGain -> Osc Freq
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    
    // Routing: Osc -> Filter -> Gain -> Master
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    mod.start(t);
    osc.stop(t + 2.0);
    mod.stop(t + 2.0);
  }

  // Sci-Fi Pulse/Explosion (for disperse)
  playDisperse() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Layer 1: Low Boom
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.frequency.setValueAtTime(150, t);
    osc1.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    gain1.gain.setValueAtTime(0.5, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);

    // Layer 2: High Sci-Fi Laser/Sweep
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(800, t);
    osc2.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.linearRampToValueAtTime(100, t + 0.4);

    gain2.gain.setValueAtTime(0.2, t);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc2.connect(filter);
    filter.connect(gain2);
    gain2.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1);
    osc2.stop(t + 1);
  }
}

export const audioManager = new AudioSynth();