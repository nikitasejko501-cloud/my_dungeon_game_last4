type SfxName =
  | 'ui-click' | 'ui-hover' | 'purchase' | 'skill-up' | 'reject'
  | 'slash' | 'bow-shot' | 'magic-bolt' | 'chain-hit'
  | 'charge' | 'arrow-rain' | 'frost-nova'
  | 'buff-ironhide' | 'buff-swift' | 'buff-barrier' | 'buff-poison'
  | 'potion-health' | 'potion-stamina' | 'revive'
  | 'enemy-hit' | 'enemy-death' | 'boss-death' | 'player-hit'
  | 'wave-start' | 'wave-clear' | 'boss-spawn' | 'capture' | 'footstep'
  | 'gold';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicOsc: OscillatorNode | null = null;
  private musicLfo: OscillatorNode | null = null;
  private isMusicPlaying = false;
  private volume = 0.7;
  private musicInterval: number | null = null;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v / 100));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  private playTone(
    freq: number, duration: number, type: OscillatorType = 'sine',
    gain = 0.3, attack = 0.01, decay = 0.1, target: GainNode | null = null,
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + attack + decay + duration);
    osc.connect(g);
    g.connect(target || this.sfxGain);
    osc.start(t);
    osc.stop(t + attack + decay + duration + 0.1);
  }

  private playNoise(duration: number, gain = 0.2, filterFreq = 1000) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + duration);
  }

  private playSweep(
    startFreq: number, endFreq: number, duration: number,
    type: OscillatorType = 'sine', gain = 0.3,
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  playSfx(name: SfxName) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    switch (name) {
      case 'ui-click': this.playTone(800, 0.05, 'square', 0.15, 0.005, 0.03); break;
      case 'ui-hover': this.playTone(600, 0.03, 'sine', 0.08, 0.005, 0.02); break;
      case 'purchase':
        this.playTone(523, 0.08, 'sine', 0.2);
        setTimeout(() => this.playTone(784, 0.12, 'sine', 0.2), 80);
        break;
      case 'skill-up':
        this.playTone(659, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(988, 0.15, 'sine', 0.2), 100);
        break;
      case 'reject': this.playTone(150, 0.15, 'sawtooth', 0.2, 0.005, 0.12); break;
      case 'slash': this.playNoise(0.15, 0.25, 2000); break;
      case 'bow-shot': this.playSweep(800, 400, 0.12, 'sine', 0.2); break;
      case 'magic-bolt': this.playSweep(400, 1200, 0.15, 'sine', 0.15); break;
      case 'chain-hit': this.playTone(200, 0.1, 'sawtooth', 0.2); this.playNoise(0.08, 0.1, 500); break;
      case 'charge': this.playSweep(200, 600, 0.2, 'sawtooth', 0.25); break;
      case 'arrow-rain':
        for (let i = 0; i < 5; i++) setTimeout(() => this.playTone(400 + i * 100, 0.06, 'sine', 0.1), i * 50);
        break;
      case 'frost-nova': this.playSweep(1200, 200, 0.3, 'sine', 0.25); break;
      case 'buff-ironhide': this.playTone(300, 0.3, 'sine', 0.2, 0.05, 0.25); break;
      case 'buff-swift': this.playSweep(400, 800, 0.2, 'sine', 0.15); break;
      case 'buff-barrier': this.playTone(500, 0.4, 'triangle', 0.2, 0.05, 0.35); break;
      case 'buff-poison': this.playSweep(600, 200, 0.25, 'sawtooth', 0.15); break;
      case 'potion-health': this.playSweep(400, 800, 0.2, 'sine', 0.2); break;
      case 'potion-stamina': this.playSweep(300, 600, 0.15, 'sine', 0.2); break;
      case 'revive':
        this.playTone(523, 0.15, 'sine', 0.25);
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.25), 150);
        setTimeout(() => this.playTone(784, 0.3, 'sine', 0.25), 300);
        break;
      case 'enemy-hit': this.playTone(200, 0.05, 'square', 0.1, 0.005, 0.04); break;
      case 'enemy-death': this.playSweep(300, 50, 0.2, 'sawtooth', 0.15); break;
      case 'boss-death':
        this.playSweep(200, 50, 0.5, 'sawtooth', 0.3);
        this.playNoise(0.5, 0.2, 500);
        break;
      case 'player-hit': this.playTone(150, 0.1, 'sawtooth', 0.25, 0.005, 0.08); break;
      case 'wave-start': this.playTone(440, 0.1, 'sine', 0.2); setTimeout(() => this.playTone(554, 0.15, 'sine', 0.2), 100); break;
      case 'wave-clear':
        this.playTone(523, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.2), 100);
        setTimeout(() => this.playTone(784, 0.2, 'sine', 0.2), 200);
        break;
      case 'boss-spawn': this.playSweep(100, 300, 0.4, 'sawtooth', 0.3); break;
      case 'capture':
        this.playTone(523, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(784, 0.1, 'sine', 0.2), 80);
        setTimeout(() => this.playTone(1047, 0.2, 'sine', 0.2), 160);
        break;
      case 'footstep': this.playNoise(0.05, 0.05, 300); break;
      case 'gold': this.playTone(988, 0.05, 'sine', 0.15); setTimeout(() => this.playTone(1319, 0.08, 'sine', 0.15), 50); break;
      default: break;
    }
  }

  startMusic() {
    if (!this.ctx || this.isMusicPlaying) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.isMusicPlaying = true;

    const playNote = (freq: number, time: number, duration: number, gain = 0.15) => {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime + time;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.05);
      g.gain.linearRampToValueAtTime(gain * 0.7, t + duration * 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + duration + 0.1);
    };

    const bassNote = (freq: number, time: number, duration: number) => {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime + time;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + duration + 0.1);
    };

    const melody = [
      [261.63, 0.5], [329.63, 0.5], [392.0, 0.5], [523.25, 1.0],
      [493.88, 0.5], [392.0, 0.5], [329.63, 1.0],
      [349.23, 0.5], [440.0, 0.5], [523.25, 1.0],
      [493.88, 0.5], [392.0, 0.5], [329.63, 1.0],
      [392.0, 0.5], [493.88, 0.5], [587.33, 1.0],
      [523.25, 0.5], [392.0, 0.5], [329.63, 1.0],
    ];

    const bassLine = [
      [130.81, 2.0], [174.61, 2.0], [196.0, 2.0], [164.81, 2.0],
      [130.81, 2.0], [174.61, 2.0], [196.0, 2.0], [164.81, 2.0],
    ];

    const playLoop = () => {
      if (!this.isMusicPlaying) return;
      let time = 0;
      for (const [freq, dur] of melody) {
        playNote(freq as number, time, dur as number);
        time += dur as number;
      }
      let bassTime = 0;
      for (const [freq, dur] of bassLine) {
        bassNote(freq as number, bassTime, dur as number);
        bassTime += dur as number;
      }
      this.musicInterval = window.setTimeout(playLoop, time * 1000);
    };

    playLoop();
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }

  setMusicVolume(v: number) {
    if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(0.5, v / 200));
  }
}

export const audio = new AudioEngine();
export type { SfxName };

