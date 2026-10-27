/* Aftermotion ambient layer: a full-screen canvas behind the UI for auras (weather/mood) and
 * one-shot bursts (trail effects, lightning). Purely visual; idles when nothing is active. */
(function (root) {
  'use strict';
  const A = {};
  let cv = null, ctx = null, W = 0, H = 0, mode = null, bg = [], fx = [], bolts = [], raf = 0, t0 = 0, nextStrike = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  /* background population per aura */
  const AURAS = {
    storm: { n: 140, make: () => ({ k: 'rain', x: rnd(-100, W), y: rnd(-H, H), vx: 2.2, vy: rnd(13, 19), len: rnd(10, 22) }) },
    inferno: { n: 70, make: () => ({ k: 'ember', x: rnd(0, W), y: rnd(0, H), vx: rnd(-0.3, 0.3), vy: rnd(-1.6, -0.5), s: rnd(1.2, 3.2), ph: rnd(0, 6) }) },
    frost: { n: 110, make: () => ({ k: 'snow', x: rnd(0, W), y: rnd(-H, H), vx: rnd(-0.3, 0.3), vy: rnd(0.4, 1.4), s: rnd(1, 3.4), ph: rnd(0, 6) }) },
    cosmos: { n: 150, make: () => ({ k: 'star', x: rnd(0, W), y: rnd(0, H), s: rnd(0.5, 1.8), ph: rnd(0, 6), sp: rnd(0.6, 2.2) }) },
    matrix: { n: 46, make: () => ({ k: 'code', x: Math.round(rnd(0, W) / 18) * 18, y: rnd(-H, H), vy: rnd(1.5, 4), ch: '', tick: 0 }) },
    aurora: { n: 40, make: () => ({ k: 'star', x: rnd(0, W), y: rnd(0, H * 0.7), s: rnd(0.5, 1.4), ph: rnd(0, 6), sp: rnd(0.5, 1.5) }) },
    sakura: { n: 46, make: () => ({ k: 'petal', x: rnd(0, W), y: rnd(-H, H), vx: rnd(0.4, 1.3), vy: rnd(0.6, 1.5), s: rnd(4, 8), r: rnd(0, 6), vr: rnd(-0.04, 0.04), ph: rnd(0, 6) }) },
    synth: { n: 60, make: () => ({ k: 'neon', x: rnd(0, W), y: rnd(0, H), vy: rnd(-1.2, -0.3), s: rnd(1, 2.6), c: pick(['#ff5cf0', '#4fe3ff', '#b06bff']), ph: rnd(0, 6) }) },
    gold: { n: 80, make: () => ({ k: 'dust', x: rnd(0, W), y: rnd(0, H), vx: rnd(-0.25, 0.25), vy: rnd(-0.4, 0.2), s: rnd(0.8, 2.2), ph: rnd(0, 6) }) },
    void: { n: 90, make: () => { const a = rnd(0, Math.PI * 2), d = rnd(0.35, 0.8) * Math.max(W, H); return { k: 'voidp', a, d, s: rnd(0.8, 2.2), sp: rnd(0.6, 1.6) }; } },
  };
  const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789ﾊﾋﾌﾍﾎ<>/*';

  function resize() {
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  A.init = function () {
    cv = document.getElementById('ambient'); if (!cv || !cv.getContext) return;
    ctx = cv.getContext('2d'); resize();
    window.addEventListener('resize', resize);
  };
  A.setMode = function (m) {
    mode = m && AURAS[m] ? m : null;
    document.body.dataset.aura = mode || '';
    bg = [];
    if (mode) for (let i = 0; i < AURAS[mode].n; i++) bg.push(AURAS[mode].make());
    nextStrike = performance.now() + rnd(2500, 5000);
    kick();
  };
  A.mode = () => mode;
  function kick() { if (!raf && ctx) { t0 = performance.now(); raf = requestAnimationFrame(loop); } }

  /* ---------- one-shot effects ---------- */
  const BURST = {
    sparks: (x, y) => ({ k: 'spark', x, y, vx: rnd(-2.5, 2.5), vy: rnd(-3, 1), life: 40, c: '#ffffff', s: rnd(1.5, 3) }),
    hearts: (x, y) => ({ k: 'heart', x, y, vx: rnd(-1, 1), vy: rnd(-2.2, -0.8), life: 55, c: pick(['#ff5c8a', '#ff8fb1', '#ffc2d6']), s: rnd(5, 9) }),
    bubbles: (x, y) => ({ k: 'bubble', x, y, vx: rnd(-0.6, 0.6), vy: rnd(-1.8, -0.6), life: 60, c: '#9ee8ff', s: rnd(3, 8) }),
    pixels: (x, y) => ({ k: 'pixel', x, y, vx: rnd(-2, 2), vy: rnd(-2.5, 0.5), life: 38, c: pick(['#6dffb3', '#4fe3ff', '#ffe066', '#ff5cf0']), s: rnd(3, 5) }),
    snow: (x, y) => ({ k: 'snowb', x, y, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 0.6), life: 60, c: '#ffffff', s: rnd(1.5, 3.2) }),
    petals: (x, y) => ({ k: 'petalb', x, y, vx: rnd(-1.6, 1.6), vy: rnd(-1.8, 0.4), life: 70, c: pick(['#ffb3d1', '#ff8fb1', '#fff0f6']), s: rnd(4, 7), r: rnd(0, 6), vr: rnd(-0.15, 0.15) }),
    embers: (x, y) => ({ k: 'spark', x, y, vx: rnd(-1.4, 1.4), vy: rnd(-3, -0.8), life: 50, c: pick(['#ff7a3d', '#ffc24b', '#ff3b2e']), s: rnd(1.5, 3.2), glow: 1 }),
    confetti: (x, y) => ({ k: 'pixel', x, y, vx: rnd(-2.4, 2.4), vy: rnd(-3, 0), life: 50, c: 'hsl(' + rnd(0, 360) + ',90%,65%)', s: rnd(3, 5) }),
    comet: (x, y) => ({ k: 'spark', x, y, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), life: 34, c: '#ffe066', s: rnd(2, 4), glow: 1 }),
    smoke: (x, y) => ({ k: 'smoke', x, y, vx: rnd(-0.5, 0.5), vy: rnd(-1, -0.2), life: 60, c: '#6e64a8', s: rnd(5, 9) }),
    stars: (x, y) => ({ k: 'starb', x, y, vx: rnd(-2.2, 2.2), vy: rnd(-2.6, 0.4), life: 50, c: pick(['#fff3c4', '#ffffff', '#ffe066']), s: rnd(3, 6) }),
    flames: (x, y) => ({ k: 'flame', x: x + rnd(-8, 8), y, vx: rnd(-0.4, 0.4), vy: rnd(-2.6, -1.2), life: 40, c: pick(['#ff5a2e', '#ff9a3d', '#ffc24b']), s: rnd(4, 8) }),
    code: (x, y) => ({ k: 'codeb', x: x + rnd(-14, 14), y: y + rnd(-10, 10), vx: 0, vy: rnd(0.8, 2), life: 50, c: '#39ff8a', ch: pick(GLYPHS) }),
    neon: (x, y) => ({ k: 'spark', x, y, vx: rnd(-2, 2), vy: rnd(-2.4, 0.4), life: 45, c: pick(['#ff5cf0', '#4fe3ff']), s: rnd(1.5, 3), glow: 1 }),
    implode: (x, y) => { const a = rnd(0, 6.28), d = rnd(30, 60); return { k: 'spark', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.cos(a) * d / 30, vy: -Math.sin(a) * d / 30, life: 30, c: '#b06bff', s: rnd(1.5, 3), glow: 1 }; },
  };
  A.burst = function (kind, x, y, n) {
    if (!ctx || !BURST[kind]) return;
    for (let i = 0; i < (n || 12); i++) { const p = BURST[kind](x, y); p.max = p.life; fx.push(p); }
    kick();
  };
  function jag(x1, y1, x2, y2, rough) {
    let pts = [[x1, y1], [x2, y2]];
    for (let it = 0; it < 5; it++) {
      const next = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay);
        next.push(pts[i], [(ax + bx) / 2 + rnd(-1, 1) * len * rough, (ay + by) / 2 + rnd(-1, 1) * len * rough]);
      }
      next.push(pts[pts.length - 1]); pts = next;
    }
    return pts;
  }
  /* A lightning bolt between two screen points. */
  A.bolt = function (x1, y1, x2, y2, color, width) {
    if (!ctx) return;
    bolts.push({ pts: jag(x1, y1, x2, y2, 0.22), life: 14, max: 14, c: color || '#bfeaff', w: width || 2.5 });
    if (Math.random() < 0.6) bolts.push({ pts: jag(x1, y1, (x1 + x2) / 2 + rnd(-60, 60), (y1 + y2) / 2 + rnd(-20, 40), 0.25), life: 10, max: 10, c: color || '#bfeaff', w: 1.2 });
    kick();
  };
  /* Sky strike onto a point, with a screen flash. */
  A.strike = function (x, y) { A.bolt(x + rnd(-160, 160), -20, x, y, '#dff4ff', 3.2); A.flash(); A.burst('sparks', x, y, 14); };
  A.flash = function () {
    const f = document.getElementById('flash'); if (!f) return;
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  };

  function drawHeart(x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.4, y - s, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.4, x, y + s * 0.35); ctx.fill();
  }
  function drawStar(x, y, R) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? R * 0.45 : R; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
    ctx.closePath(); ctx.fill();
  }

  function loop(now) {
    raf = 0;
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    // background aura
    for (const p of bg) {
      switch (p.k) {
        case 'rain':
          p.x += p.vx; p.y += p.vy; if (p.y > H) { p.y = rnd(-80, -10); p.x = rnd(-100, W); }
          ctx.strokeStyle = 'rgba(170,220,255,.28)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 1.6, p.y + p.len); ctx.stroke(); break;
        case 'ember':
          p.x += p.vx + Math.sin(t * 2 + p.ph) * 0.3; p.y += p.vy; if (p.y < -10) { p.y = H + 10; p.x = rnd(0, W); }
          ctx.fillStyle = 'rgba(255,' + (120 + ((Math.sin(t * 6 + p.ph) + 1) * 50) | 0) + ',40,' + (0.45 + 0.35 * Math.sin(t * 5 + p.ph)) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); break;
        case 'snow':
          p.x += p.vx + Math.sin(t + p.ph) * 0.5; p.y += p.vy; if (p.y > H + 5) { p.y = -5; p.x = rnd(0, W); }
          ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); break;
        case 'star':
          ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.6 * Math.abs(Math.sin(t * p.sp + p.ph))) + ')'; ctx.fillRect(p.x, p.y, p.s, p.s); break;
        case 'code':
          p.y += p.vy; if (p.y > H + 20) { p.y = rnd(-200, -20); }
          if (++p.tick % 6 === 0 || !p.ch) p.ch = pick(GLYPHS);
          ctx.font = '14px monospace'; ctx.fillStyle = 'rgba(57,255,138,.55)'; ctx.fillText(p.ch, p.x, p.y);
          ctx.fillStyle = 'rgba(57,255,138,.18)'; ctx.fillText(pick(GLYPHS), p.x, p.y - 18); break;
        case 'petal':
          p.x += p.vx + Math.sin(t + p.ph) * 0.6; p.y += p.vy; p.r += p.vr; if (p.y > H + 10 || p.x > W + 10) { p.y = rnd(-40, -5); p.x = rnd(-60, W); }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = 'rgba(255,179,209,.8)'; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.28); ctx.fill(); ctx.restore(); break;
        case 'neon':
          p.y += p.vy; if (p.y < -10) { p.y = H + 10; p.x = rnd(0, W); }
          ctx.fillStyle = p.c; ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + p.ph); ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; break;
        case 'dust':
          p.x += p.vx; p.y += p.vy; if (p.y < -5 || p.y > H + 5) p.y = rnd(0, H);
          ctx.fillStyle = 'rgba(255,214,102,' + (0.25 + 0.6 * Math.abs(Math.sin(t * 2 + p.ph))) + ')'; drawStar(p.x, p.y, p.s * 1.6); break;
        case 'voidp': {
          p.d -= p.sp; if (p.d < 20) { p.d = rnd(0.5, 0.8) * Math.max(W, H); p.a = rnd(0, 6.28); }
          p.a += 0.002;
          const x = W / 2 + Math.cos(p.a) * p.d, y = H / 2 + Math.sin(p.a) * p.d * 0.7;
          ctx.fillStyle = 'rgba(176,107,255,' + Math.min(0.7, p.d / 500) + ')'; ctx.fillRect(x, y, p.s, p.s); break;
        }
      }
    }
    // storm: random sky strikes
    if (mode === 'storm' && now > nextStrike) { A.strike(rnd(W * 0.1, W * 0.9), rnd(H * 0.4, H * 0.9)); nextStrike = now + rnd(5000, 11000); }
    if (mode === 'cosmos' && Math.random() < 0.006) fx.push({ k: 'shoot', x: rnd(0, W), y: rnd(0, H * 0.4), vx: rnd(7, 11), vy: rnd(2, 4), life: 40, max: 40, c: '#fff' });
    // bursts
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i]; p.life--; if (p.life <= 0) { fx.splice(i, 1); continue; }
      const a = p.life / p.max; p.x += p.vx; p.y += p.vy;
      if (p.k !== 'codeb' && p.k !== 'shoot') p.vy += 0.04;
      ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.strokeStyle = p.c;
      if (p.glow) { ctx.shadowColor = p.c; ctx.shadowBlur = 8; }
      switch (p.k) {
        case 'spark': ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); break;
        case 'heart': drawHeart(p.x, p.y, p.s); break;
        case 'bubble': ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.stroke(); break;
        case 'pixel': ctx.fillRect(p.x, p.y, p.s, p.s); break;
        case 'snowb': ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); break;
        case 'petalb': p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.28); ctx.fill(); ctx.restore(); break;
        case 'smoke': p.s += 0.25; ctx.globalAlpha = a * 0.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); break;
        case 'starb': drawStar(p.x, p.y, p.s); break;
        case 'flame': p.s *= 0.97; ctx.shadowColor = p.c; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); break;
        case 'codeb': ctx.font = '13px monospace'; ctx.fillText(p.ch, p.x, p.y); break;
        case 'shoot': ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 6, p.y - p.vy * 6); ctx.stroke(); break;
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    // lightning
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.life--; if (b.life <= 0) { bolts.splice(i, 1); continue; }
      ctx.globalAlpha = b.life / b.max; ctx.strokeStyle = b.c; ctx.lineWidth = b.w; ctx.shadowColor = '#7fd6ff'; ctx.shadowBlur = 18; ctx.lineJoin = 'round';
      ctx.beginPath(); b.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = b.w * 0.4; ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    if (mode || fx.length || bolts.length) raf = requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, W, H);
  }
  root.AMAmbient = A;
})(window);
