/* =====================================================================
 * 8b) KLANG – alles live erzeugt (Web Audio), keine Dateien
 * Musik: weiche Pentatonik-Töne mit Hall. Natur: Wind, Vögel am Tag,
 * Grillen nachts, Lagerfeuer, Regen. Ereignisse: Axt, Glockenspiel.
 * ===================================================================== */
class Sound {
  constructor() { this.ctx = null; this.on = false; this.nextNote = 0; this.nextBird = 0; this.nextCricket = 0; this.nextCrackle = 0; }

  start() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const a = this.ctx = new AC();
      this.master = a.createGain(); this.master.gain.value = 0.7; this.master.connect(a.destination);
      // Hall: zwei rückgekoppelte Echos
      this.verb = a.createGain(); this.verb.gain.value = 0.35;
      const d1 = a.createDelay(), d2 = a.createDelay(), fb = a.createGain(), lp = a.createBiquadFilter();
      d1.delayTime.value = 0.23; d2.delayTime.value = 0.37; fb.gain.value = 0.45; lp.type = 'lowpass'; lp.frequency.value = 2200;
      this.verb.connect(d1); d1.connect(d2); d2.connect(lp); lp.connect(fb); fb.connect(d1); lp.connect(this.master);
      // Rauschquelle für Wind, Regen, Feuer
      const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) { const wv = Math.random() * 2 - 1; last = (last + 0.02 * wv) / 1.02; data[i] = last * 3.5; }
      this.noiseBuf = buf;
      const loop = (type, freq, q) => {
        const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
        const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        const g = a.createGain(); g.gain.value = 0;
        src.connect(f); f.connect(g); g.connect(this.master); src.start();
        return g;
      };
      this.wind = loop('lowpass', 500, 0.5);
      this.rainGain = loop('highpass', 1200, 0.3);
      this.fire = loop('bandpass', 700, 0.8);
    }
    this.ctx.resume();
    this.on = true;
    return true;
  }

  stop() { this.on = false; if (this.ctx) this.ctx.suspend(); }

  tone(freq, when, dur, vol, type = 'sine', toVerb = true) {
    const a = this.ctx, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + Math.min(0.4, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(this.master); if (toVerb) g.connect(this.verb);
    o.start(when); o.stop(when + dur + 0.05);
  }

  chime() { // Glockenspiel bei Ereignissen
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.12, 1.4, 0.07, 'triangle'));
  }

  levelUp() { // aufsteigende Fanfare
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, t + i * 0.07, 1.6, 0.06, i % 2 ? 'sine' : 'triangle'));
  }

  chop(dist) { // dumpfer Axtschlag, leiser je weiter weg
    if (!this.on || dist > 9) return;
    const a = this.ctx, t = a.currentTime, vol = 0.18 * (1 - dist / 10);
    const src = a.createBufferSource(); src.buffer = this.noiseBuf;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
    const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t, Math.random()); src.stop(t + 0.15);
    this.tone(140, t, 0.12, vol * 0.6, 'sine', false);
  }

  /** Läuft jedes Bild: Lautstärken an Tageszeit, Wetter und Kamera anpassen, Zufallsklänge. */
  update(sim, renderer) {
    if (!this.on || !this.ctx) return;
    const a = this.ctx, t = a.currentTime, h = sim.hourFloat;
    const night = renderer.nightAlpha() / 0.72, raining = sim.weather === 'regen';
    const cp = sim.settlement.camp;
    const camTx = (renderer.camX + renderer.viewW / 2) / renderer.ts, camTy = (renderer.camY + renderer.viewH / 2) / renderer.ts;
    const fireNear = clamp(1 - Math.hypot(cp.x - camTx, cp.y - camTy) / 9, 0, 1);
    const ramp = (g, v) => g.gain.setTargetAtTime(v, t, 0.8);
    ramp(this.wind, 0.05 + (sim.weather === 'bewölkt' ? 0.04 : 0) + (raining ? 0.05 : 0));
    ramp(this.rainGain, raining ? 0.12 : 0);
    ramp(this.fire, 0.05 * fireNear * (0.5 + night));
    // Musik: ruhige Töne aus einer Pentatonik, nachts tiefer und seltener
    if (t > this.nextNote) {
      const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
      const f = scale[Math.floor(Math.random() * scale.length)] * (night > 0.5 ? 0.5 : 1);
      this.tone(f, t, 3.5, 0.045, 'sine');
      if (Math.random() < 0.4) this.tone(f * 1.5, t + 0.05, 3, 0.02, 'triangle');
      this.nextNote = t + (night > 0.5 ? 3.5 : 2.2) + Math.random() * 2.5;
    }
    // Vögel am Tag
    if (night < 0.3 && !raining && t > this.nextBird) {
      const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const o = a.createOscillator(), g = a.createGain(), st = t + i * 0.11;
        o.frequency.setValueAtTime(base, st); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), st + 0.07);
        g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.03, st + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.09);
        o.connect(g); g.connect(this.master); g.connect(this.verb); o.start(st); o.stop(st + 0.1);
      }
      this.nextBird = t + 2 + Math.random() * 6;
    }
    // Grillen in der Nacht
    if (night > 0.5 && !raining && t > this.nextCricket) {
      for (let i = 0; i < 3; i++) {
        const o = a.createOscillator(), g = a.createGain(), st = t + i * 0.06;
        o.frequency.value = 4400; g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.012, st + 0.01); g.gain.linearRampToValueAtTime(0, st + 0.04);
        o.connect(g); g.connect(this.master); o.start(st); o.stop(st + 0.05);
      }
      this.nextCricket = t + 0.6 + Math.random() * 1.2;
    }
    // Lautenmusik aus der Taverne am Abend
    const tav = sim.capital && sim.capital.tavern, hr = sim.hourFloat;
    if (tav && hr >= 18 && hr < 23 && Math.hypot(tav.tile.x - camTx, tav.tile.y - camTy) < 9 && t > (this.nextLute || 0)) {
      const sc = [196, 220, 246.94, 293.66, 329.63, 392];
      this.tone(sc[Math.floor(Math.random() * sc.length)], t, 0.9, 0.035, 'triangle');
      this.nextLute = t + 0.25 + Math.random() * 0.45;
    }
    // Knistern am Feuer
    if (fireNear > 0.1 && t > this.nextCrackle) {
      const src = a.createBufferSource(); src.buffer = this.noiseBuf;
      const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
      const g = a.createGain(); g.gain.setValueAtTime(0.08 * fireNear, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t, Math.random()); src.stop(t + 0.04);
      this.nextCrackle = t + 0.05 + Math.random() * 0.4;
    }
  }
}

