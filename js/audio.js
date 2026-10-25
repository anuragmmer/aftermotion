/* Tiny WebAudio synth for game feedback. No asset files; silent if audio is unavailable. */
(function (root) {
  'use strict';
  let ctx = null, enabled = true, master = null;
  function ac() {
    if (!enabled) return null;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, vol, when, slideTo) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, fromHz, toHz) {
    const c = ac(); if (!c) return;
    const t = c.currentTime, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.setValueAtTime(fromHz, t); f.frequency.exponentialRampToValueAtTime(toHz, t + dur);
    g.gain.value = vol; src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }
  const TAPE = [392, 440, 494, 523, 587, 659];
  const SFX = {
    setEnabled(v) { enabled = v; },
    move() { tone(300, 0.07, 'triangle', 0.18, 0, 380); },
    tape(i) { tone(TAPE[Math.min(i, TAPE.length - 1)], 0.09, 'square', 0.06); },
    fire() { tone(660, 0.12, 'triangle', 0.22); tone(990, 0.18, 'sine', 0.18, 0.06); tone(1320, 0.22, 'sine', 0.1, 0.12); },
    echoBlocked() { tone(220, 0.12, 'sawtooth', 0.08, 0, 160); },
    blocked() { tone(110, 0.14, 'sine', 0.4, 0, 70); noise(0.06, 0.15, 400, 200); },
    push() { noise(0.12, 0.2, 300, 900); },
    door(open) { noise(0.25, 0.18, open ? 500 : 2000, open ? 2400 : 400); },
    coin() { tone(988, 0.08, 'square', 0.08); tone(1319, 0.2, 'square', 0.08, 0.07); },
    build() { tone(180, 0.1, 'square', 0.12); noise(0.08, 0.2, 800, 300); },
    alarm() { tone(880, 0.08, 'square', 0.07); tone(880, 0.08, 'square', 0.07, 0.12); },
    slam() { tone(90, 0.2, 'sine', 0.45, 0, 50); noise(0.1, 0.25, 600, 150); },
    hop() { tone(400, 0.18, 'sine', 0.2, 0, 1200); },
    favour() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, i * 0.05)); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, i * 0.09)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.08, i * 0.14)); },
    star(i) { tone(784 + i * 196, 0.25, 'triangle', 0.18); },
    click() { tone(520, 0.04, 'square', 0.05); },
    undo() { tone(500, 0.1, 'sine', 0.12, 0, 300); },
  };
  root.AMAudio = SFX;
})(window);
