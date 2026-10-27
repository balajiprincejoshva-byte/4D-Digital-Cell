// Web Audio API Synthesizer for Presentation & Workstation Sound Effects
// 100% Free, Zero-Dependency, Royalty-Free, Zero-Latency synthesized audio

class SoundFXService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Check localStorage preference
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('neo_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    }
  }

  private initCtx() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('neo_sound_muted', String(this.isMuted));
    }
    if (!this.isMuted) {
      this.playClick();
    }
    return this.isMuted;
  }

  // 1. Cinematic Warm Harmonic Chime (Entering Presentation Mode)
  public playEnterPresentation() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic triad: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.5Hz)
    const notes = [
      { freq: 523.25, time: 0, dur: 0.65 },
      { freq: 659.25, time: 0.08, dur: 0.65 },
      { freq: 783.99, time: 0.16, dur: 0.75 },
      { freq: 1046.5, time: 0.24, dur: 0.95 }
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.12, now + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });

    // Subtle warm bass undertone
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(130.81, now); // C3
    bassGain.gain.setValueAtTime(0.15, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 0.7);
  }

  // 2. Soft Descending Resolution (Exiting Presentation Mode)
  public playExitPresentation() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 783.99, time: 0, dur: 0.4 },
      { freq: 659.25, time: 0.07, dur: 0.4 },
      { freq: 523.25, time: 0.14, dur: 0.55 }
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.09, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  }

  // 3. Airy Slide Swipe / Whoosh (Slide Transitions)
  public playSlideTransition() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.14;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for elegant soft paper/slide air feel
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + 0.14);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.14);

    // Subtle gentle chime ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(880, now); // A5
    pingGain.gain.setValueAtTime(0.035, now);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(now);
    ping.stop(now + 0.12);
  }

  // 4. Tactile Interblend Click / Navigation Pop
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const soundFX = new SoundFXService();
