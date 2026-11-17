// Klang ohne eine einzige Sounddatei: alles entsteht in WebAudio.
//
// Vier Dauerstimmen laufen durchgehend und werden nur in Lautstaerke, Filter und
// Seite nachgefuehrt: das Wasser direkt am Angler, die Rausche an den Steinen,
// der naechste Wasserfall und der Wind. Dazu eine Klickschleife fuer die
// Rollenbremse und kurze Ereignisklaenge (Plopp, Platscher, Schritt, Riss).
//
// Richtung entsteht ueber StereoPanner. Die Kamera blickt in Richtung
// (-sin yaw, -cos yaw), rechts von ihr liegt (cos yaw, -sin yaw); das Skalarprodukt
// aus dieser Rechtsachse und der Richtung zur Quelle ergibt die Seite.
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
// Gesamtpegel der Dauerstimmen (Wasser und Wind). Die Zahlen in setField beschreiben nur
// das Verhaeltnis untereinander; wie laut der Fluss insgesamt steht, haengt allein hier.
const AMB = 0.2;

export class Sfx {
  constructor() {
    this.ctx = null; this.on = true; this.vol = 1;
    this._L = { x: 0, z: 0, yaw: 0 };   // Hoerer: Ort und Blickrichtung
    this._sp = 0.5;                      // Stroemung des Reviers
    this._light = 'tag';
    this._birdT = 0; this._tPrev = 0;
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.on ? this.vol : 0;
    this.master.connect(ctx.destination);
    // Alle Dauerstimmen haengen an diesem einen Regler. Er steht bewusst tief:
    // ein Fluss rauscht im Spiel sonst lauter als alles, was man hoeren will - Ringe, Bremse, Schritte.
    this.amb = ctx.createGain(); this.amb.gain.value = AMB; this.amb.connect(this.master);
    this.noiseBuf = this.brown = this._noise(true);    // noiseBuf: alter Name, von burst() benutzt
    this.white = this._noise(false);
    // Nahfeld: dumpf und breit, kein Panning - das Wasser ist rundherum
    this.vNear = this._voice({ brown: true, type: 'lowpass', freq: 760, lf: 0.11, la: 170, pan: false });
    // Rausche an den Steinen: heller, zischend, gerichtet
    this.vRiff = this._voice({ brown: false, type: 'bandpass', freq: 2000, q: 0.5, lf: 0.19, la: 430 });
    // Wasserfall: schwer, mit Druck im Bass
    this.vFall = this._voice({ brown: true, type: 'lowpass', freq: 640, lf: 0.07, la: 130 });
    // Wind: sehr dumpf, boeig
    this.vWind = this._voice({ brown: false, type: 'lowpass', freq: 420, lf: 0.043, la: 230 });
    this.drg = this._clicks();
    this.setRiver(this._sp);
  }

  // 3 s Rauschen. Braun (integriert) klingt nach Wasser, weiss nach Zischen und Wind.
  _noise(brown) {
    const ctx = this.ctx, len = ctx.sampleRate * 3, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.05 * w) / 1.05; d[i] = last * 3 + w * 0.12; }
      else { last = (last + 0.35 * w) / 1.35; d[i] = last * 1.4; }
    }
    return b;
  }

  // Eine Dauerstimme: Rauschen -> Filter -> Seite -> Lautstaerke.
  // Ein langsamer Oszillator bewegt die Filterfrequenz, sonst steht der Klang wie ein Standbild.
  _voice(o) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = o.brown ? this.brown : this.white; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type; f.frequency.value = o.freq; if (o.q) f.Q.value = o.q;
    const g = ctx.createGain(); g.gain.value = 0;
    const lfo = ctx.createOscillator(), la = ctx.createGain();
    lfo.frequency.value = o.lf; la.gain.value = o.la; lfo.connect(la); la.connect(f.frequency);
    let p = null;
    if (o.pan !== false && ctx.createStereoPanner) { p = ctx.createStereoPanner(); f.connect(p); p.connect(g); }
    else f.connect(g);
    s.connect(f); g.connect(this.amb);
    s.start(ctx.currentTime, Math.random() * 2.5); lfo.start();
    return { g, p, f, base: o.freq };
  }

  // Klickschleife fuer die Bremse: 20 Klicks je Sekunde im Puffer,
  // die Abspielrate macht daraus 3 bis 60 - und hebt dabei die Tonhoehe, wie eine echte Bremse.
  _clicks() {
    const ctx = this.ctx, sr = ctx.sampleRate, b = ctx.createBuffer(1, sr, sr), d = b.getChannelData(0);
    const n = 20, step = sr / n, klen = Math.min(step | 0, (sr * 0.02) | 0);
    for (let i = 0; i < n; i++) {
      const o = Math.round(i * step);
      for (let j = 0; j < klen; j++) {
        const e = Math.exp(-j / (sr * 0.0014));
        d[o + j] += (Math.random() * 2 - 1) * e * 0.5 + Math.sin(j / sr * 2 * Math.PI * 2400) * e * 0.5;
      }
    }
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2300; f.Q.value = 1.1;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
    return { s, g };
  }

  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? this.vol : 0; }
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = this.on ? v : 0; }
  // nur zum Abstimmen: in der Konsole __nm.sfx.setAmb(0.3) probiert den Flusspegel ohne Neuladen
  setAmb(k) { if (this.amb) this.amb.gain.setTargetAtTime(k, this.ctx.currentTime, 0.2); }

  // Revierwechsel: Grundcharakter des Wassers und das Licht (bestimmt die Vogelstimmen)
  setRiver(speed, light) {
    this._sp = speed;
    if (light) this._light = light;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // schneller Fluss rauscht heller
    this.vNear.f.frequency.setTargetAtTime(620 + speed * 520, t, 0.6);
    this.vRiff.f.frequency.setTargetAtTime(1700 + speed * 900, t, 0.6);
    if (!this._fieldOn) this.vNear.g.gain.setTargetAtTime(0.1 + speed * 0.12, t, 0.8);   // bis die erste Standortmeldung kommt
  }

  // Alter Name aus der Zeit vor dem Richtungsklang: der naechste Wasserfall als blosse Naehe.
  setNear(k) { this._fallK = k; }

  // Schwerpunkt einer Quellenliste aus Sicht des Hoerers: Lautstaerke und Seite.
  // Die Lautstaerke faellt mit dem Quadrat des Abstands, wie in echt.
  _aim(list, reach) {
    const L = this._L; let g = 0, sx = 0, sz = 0;
    for (const q of list) {
      const dx = q.x - L.x, dz = q.z - L.z, d = Math.hypot(dx, dz) || 1e-3;
      const a = (q.k === undefined ? 1 : q.k) / (1 + (d / reach) * (d / reach));
      if (a < 0.004) continue;
      g += a; sx += dx / d * a; sz += dz / d * a;
    }
    if (g <= 0) return { g: 0, pan: 0 };
    const s = Math.sin(L.yaw), c = Math.cos(L.yaw);
    return { g, pan: clamp((sx * c - sz * s) / g, -1, 1) };
  }

  _set(v, gain, pan, freq) {
    const t = this.ctx.currentTime;
    v.g.gain.setTargetAtTime(gain, t, 0.25);
    if (v.p && pan !== undefined) v.p.pan.setTargetAtTime(pan, t, 0.35);
    if (freq !== undefined) v.f.frequency.setTargetAtTime(freq, t, 0.4);
  }

  // Standortmeldung des Spiels, etwa achtmal je Sekunde.
  // near: wie tief und schnell das Wasser am Angler ist; riffles: Steine; falls: Wasserfaelle.
  setField(o) {
    if (!this.ctx || !this.on) return;
    const L = this._L; L.x = o.x; L.z = o.z; L.yaw = o.yaw || 0;
    this._fieldOn = true;
    const t = this.ctx.currentTime;

    // Wasser am Angler: watet er, rauscht es um die Beine; am Ufer bleibt der Fluss weiter weg
    const wet = clamp(o.depth || 0, 0, 1.2);
    this.vNear.g.gain.setTargetAtTime(0.09 + this._sp * 0.1 + wet * 0.16, t, 0.5);
    this.vNear.f.frequency.setTargetAtTime(560 + this._sp * 500 + wet * 420, t, 0.6);

    // In einem Steinfeld summieren sich schnell ein Dutzend Quellen. Die Kennlinie saettigt deshalb,
    // sonst klebt die Rausche im Steingarten am Anschlag und reagiert dort auf nichts mehr.
    const rf = this._aim(o.riffles || [], 5.5);
    this._set(this.vRiff, 0.26 * rf.g / (rf.g + 1.6), rf.pan, 1700 + this._sp * 900 + 700 * rf.g / (rf.g + 2));

    // Ein Wasserfall traegt weit, darum die groessere Reichweite
    const fa = this._aim(o.falls || [], 20);
    this._set(this.vFall, 0.6 * fa.g / (fa.g + 0.55), fa.pan, 520 + 380 * fa.g / (fa.g + 0.8));

    // Wind: Grundzug plus langsame Boeen
    const gust = 0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.073);
    this.vWind.g.gain.setTargetAtTime(0.012 + gust * 0.03, t, 1.2);

    this._birds(t);
  }

  // Vogelstimmen: in Morgen und Abend dicht, mittags vereinzelt, bei bedecktem Himmel still
  _birds(t) {
    if (!this._birdT) { this._birdT = t + 3; return; }
    if (t < this._birdT) return;
    const l = this._light;
    const every = l === 'morgen' ? 3.5 : l === 'abend' ? 4.5 : l === 'mittag' ? 11 : 16;
    this._birdT = t + every * (0.5 + Math.random());
    const pan = Math.random() * 2 - 1, f0 = 2100 + Math.random() * 2300, n = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const f = f0 * (0.86 + Math.random() * 0.3);
      this.tone(f, f * (1.12 + Math.random() * 0.3), 0.055 + Math.random() * 0.05, 0.035, 'sine', i * (0.07 + Math.random() * 0.06), pan);
    }
  }

  // ---------- kurze Klaenge ----------
  // pan: -1 links, 1 rechts; undefined heisst Mitte
  _out(pan) {
    if (pan === undefined || !this.ctx.createStereoPanner) return this.master;
    const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(this.master);
    return p;
  }

  tone(f0, f1, dur, vol = 0.2, type = 'sine', delay = 0, pan) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this._out(pan)); o.start(t); o.stop(t + dur + 0.02);
  }

  burst(dur, vol, freq, pan, q = 0.8, white = false) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime, s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    s.buffer = white ? this.white : this.brown; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this._out(pan)); s.start(t, Math.random() * 2, dur + 0.05);
  }

  // Lautstaerke und Seite eines Ereignisses an einem Ort im Revier
  at(x, z, reach = 9) {
    const L = this._L, dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz) || 1e-3;
    const s = Math.sin(L.yaw), c = Math.cos(L.yaw);
    return { k: 1 / (1 + (d / reach) * (d / reach)), pan: clamp((dx / d * c - dz / d * s), -1, 1), d };
  }

  plop(x, z) {
    const a = x === undefined ? { k: 1, pan: undefined } : this.at(x, z, 10);
    if (a.k < 0.02) return;
    this.tone(520, 140, 0.12, 0.18 * a.k, 'sine', 0, a.pan); this.burst(0.12, 0.25 * a.k, 1800, a.pan);
  }

  // Ein steigender Fisch: ein weicher Schlurf, kein Pieps. Man hoert, wo er steht.
  rise(x, z) {
    const a = this.at(x, z, 9);
    if (a.k < 0.06) return;   // ueber gut 30 m hoert man einen Ring nicht mehr durch das Rauschen
    this.tone(360 + Math.random() * 160, 110, 0.1, 0.12 * a.k, 'sine', 0, a.pan);
    this.burst(0.16, 0.16 * a.k, 900 + Math.random() * 500, a.pan, 1.2);
  }

  splash(x, z, size = 1) {
    const a = x === undefined ? { k: 1, pan: undefined } : this.at(x, z, 12);
    if (a.k < 0.02) return;
    this.burst(0.25 + size * 0.2, 0.5 * a.k * Math.min(1.4, size), 1100 / Math.max(0.6, size), a.pan, 0.6);
    this.tone(200 / Math.max(0.6, size), 60, 0.18, 0.1 * a.k * size, 'sine', 0, a.pan);
  }

  // Schritt: im Wasser schwappt es, am Ufer knirscht der Kies
  wade(deep) {
    if (deep > 0.12) { this.burst(0.2 + deep * 0.2, 0.1 + deep * 0.16, 700 + Math.random() * 400, undefined, 0.5); this.tone(150, 70, 0.1, 0.04, 'sine'); }
    else this.burst(0.07, 0.085, 3800 + Math.random() * 1800, undefined, 1.6, true);
  }

  // Wurf: Rute pfeift, danach zieht die Schnur durch die Ringe
  whip(power = 1) {
    this.burst(0.16, 0.22 + power * 0.14, 2400 + power * 1400, undefined, 1.1, true);
    this.tone(1100 + power * 700, 320, 0.13, 0.03 + power * 0.03, 'sawtooth', 0.03);
  }

  // Rollenbremse: rate in Klicks je Sekunde, 0 schaltet sie ab
  drag(rate, vol = 0.1) {
    if (!this.ctx || !this.drg) return;
    const t = this.ctx.currentTime;
    this.drg.s.playbackRate.setTargetAtTime(clamp(rate / 20, 0.15, 3), t, 0.06);
    this.drg.g.gain.setTargetAtTime(this.on ? vol : 0, t, rate > 0 ? 0.05 : 0.12);
  }

  tick() { this.tone(900, 700, 0.03, 0.05, 'triangle'); }
  reel() { this.tone(1500, 1200, 0.025, 0.07, 'square'); }
  snap() { this.tone(300, 60, 0.2, 0.3, 'sawtooth'); this.burst(0.1, 0.4, 4000); }
  bite() { this.tone(180, 120, 0.09, 0.22, 'triangle'); }
  chime() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.5, 0.13, 'sine', i * 0.11)); }
  fanfare() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.8, 0.13, 'triangle', i * 0.14)); }
}
