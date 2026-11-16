// Kleiner WebAudio-Synth: Flussrauschen und Effekte, ohne Sounddateien
export class Sfx {
  constructor() { this.ctx = null; this.on = true; this.vol = 1; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.on ? this.vol : 0; this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.05 * w) / 1.05; d[i] = last * 3 + w * 0.12; }
    this.noiseBuf = buf;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
    this.riverGain = ctx.createGain(); this.riverGain.gain.value = 0.22;
    src.connect(f); f.connect(this.riverGain); this.riverGain.connect(this.master); src.start();
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? this.vol : 0; }
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = this.on ? v : 0; }
  setRiver(speed) { this._rb = 0.12 + Math.min(0.3, speed * 0.2); this._near = 0; if (this.riverGain) this.riverGain.gain.setTargetAtTime(this._rb, this.ctx.currentTime, 0.5); }
  // Naehe zu einem Wasserfall (0..1): das Rauschen schwillt an
  setNear(k) { if (!this.riverGain || Math.abs(k - (this._near || 0)) < 0.03) return; this._near = k; this.riverGain.gain.setTargetAtTime((this._rb || 0.2) * (1 + k * 1.6), this.ctx.currentTime, 0.4); }
  tone(f0, f1, dur, vol = 0.2, type = 'sine', delay = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  burst(dur, vol, freq) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime, s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    s.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 2, dur + 0.05);
  }
  plop() { this.tone(520, 140, 0.12, 0.18); this.burst(0.12, 0.25, 1800); }
  whip() { this.burst(0.16, 0.3, 3200); }
  tick() { this.tone(900, 700, 0.03, 0.05, 'triangle'); }
  reel() { this.tone(1500, 1200, 0.025, 0.07, 'square'); }
  splash() { this.burst(0.4, 0.5, 1100); }
  snap() { this.tone(300, 60, 0.2, 0.3, 'sawtooth'); this.burst(0.1, 0.4, 4000); }
  bite() { this.tone(180, 120, 0.09, 0.22, 'triangle'); }
  chime() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.5, 0.13, 'sine', i * 0.11)); }
  fanfare() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.8, 0.13, 'triangle', i * 0.14)); }
}
