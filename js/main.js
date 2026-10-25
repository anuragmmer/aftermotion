/* Aftermotion UI: reads state from the engine and sends commands; no rules live here. */
(function () {
  'use strict';
  const AM = window.AM, LEVELS = window.AMLevels, CFG = AM.CONFIG;
  const $ = (id) => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const COLORS = { trace: '#5ec8ff', flicker: '#ffd35e', mason: '#ff9a5e', keeper: '#8cff9c' };
  const SAVE_KEY = 'aftermotion.v1';

  let idx = 0, L, S, undo = [], log = [], hopMode = false, oracleOn = false, ts = 48, hover = null;

  /* ---------- persistence (best-effort) ---------- */
  function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { best: {} }; } catch (e) { return { best: {} }; } }
  function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
  let save = loadSave();

  /* ---------- level lifecycle ---------- */
  function start(i) {
    idx = Math.max(0, Math.min(LEVELS.length - 1, i));
    const r = AM.loadLevel(LEVELS[idx]);
    L = r.level; S = r.state; undo = []; log = []; hopMode = false;
    $('lvlName').textContent = L.id + '. ' + L.name;
    $('lvlMode').textContent = L.mode === 'together' ? 'Escape Together' : 'Escape Through the Echo';
    $('intro').textContent = L.intro;
    $('hudPar').textContent = L.par || '-';
    closeOverlay();
    addLog([{ text: 'Level start. Your accepted moves feed every echo\'s batch.' }]);
    resize(); refresh();
  }
  function restart() { start(idx); }

  function commit(next, events) {
    undo.push(S);
    if (undo.length > 500) undo.shift();
    S = next; hopMode = false;
    addLog(events);
    refresh();
    if (S.status === 'won') finish(true);
    else if (S.status === 'lost') finish(false);
  }
  function addLog(events) {
    for (const e of events) {
      const cls = /Blocked|cannot|refused|missed|expires|Out of/i.test(e.text) ? 'bad' : /complete|Luck|holds/i.test(e.text) ? 'good' : '';
      log.unshift({ t: e.text, c: cls });
    }
    log = log.slice(0, 60);
  }

  /* ---------- commands ---------- */
  function move(dir) {
    if (S.status !== 'play' || !isOverlayClosed()) return;
    const r = AM.step(L, S, dir);
    if (!r.accepted) { addLog(r.events); refresh(); return; }
    commit(r.state, r.events);
  }
  function favour() {
    const r = AM.activateFavour(L, S);
    if (r.ok) commit(r.state, r.events); else { addLog(r.events); refresh(); }
  }
  function hopper() { return S.echoes.find((e) => e.hop && !e.hopping && e.hop.charges > 0 && e.state !== 'COOLDOWN'); }
  function toggleHop() {
    if (S.status !== 'play') return;
    if (hopMode) { hopMode = false; } else if (hopper()) { hopMode = true; addLog([{ text: 'Hop: click a highlighted tile (range ' + CFG.hopRange + '). Esc cancels.' }]); }
    else addLog([{ text: 'No echo can hop right now.' }]);
    refresh();
  }
  function undoMove() {
    if (!undo.length) return;
    S = undo.pop(); hopMode = false; addLog([{ text: 'Undone.' }]); closeOverlay(); refresh();
  }

  /* ---------- finish overlays ---------- */
  function finish(win) {
    if (win) {
      const par = L.par || S.moves, stars = S.moves <= par ? 3 : S.moves <= par + 4 ? 2 : 1;
      if (!save.best[L.id] || S.moves < save.best[L.id].moves) save.best[L.id] = { moves: S.moves, stars };
      writeSave(save);
      const last = idx === LEVELS.length - 1;
      openOverlay('<h2>Level complete</h2><div class="stars">' + '★'.repeat(stars) + '☆'.repeat(3 - stars) +
        '</div><p>' + S.moves + ' moves' + (L.par ? ' (par ' + L.par + ')' : '') + '.</p>' +
        (last ? '<p>You finished every prototype level. Thanks for playing!</p>' : '') +
        '<div class="row"><button id="o-undo">Undo last move</button><button id="o-retry">Retry</button><button id="o-menu">Levels</button>' +
        (last ? '' : '<button id="o-next" class="on">Next ▶ (N)</button>') + '</div>');
      bind('o-next', () => start(idx + 1));
    } else {
      openOverlay('<h2>Failed</h2><p>' + S.reason + '</p><div class="row"><button id="o-undo">Undo</button><button id="o-retry" class="on">Retry (R)</button><button id="o-menu">Levels</button></div>');
    }
    bind('o-undo', undoMove); bind('o-retry', restart); bind('o-menu', menu);
  }
  const bind = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  function openOverlay(html) { $('card').innerHTML = html; $('overlay').hidden = false; const b = $('card').querySelector('button.on') || $('card').querySelector('button'); if (b) b.focus(); }
  function closeOverlay() { $('overlay').hidden = true; }
  const isOverlayClosed = () => $('overlay').hidden;

  function menu() {
    let h = '<h2>Levels</h2><div class="grid">';
    LEVELS.forEach((l, i) => {
      const b = save.best[l.id];
      h += '<button data-i="' + i + '" class="' + (b ? 'done' : '') + '">' + l.id + '<small>' + l.name + '</small><small>' + (b ? '★'.repeat(b.stars) : '&nbsp;') + '</small></button>';
    });
    h += '</div><div class="row"><button id="o-close">Close</button></div>';
    openOverlay(h);
    $('card').querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => start(+b.dataset.i)));
    bind('o-close', closeOverlay);
  }
  function help() {
    openOverlay(
      '<h2>How to play</h2>' +
      '<p>Reach the exit. Every move you make is recorded. Each <b>echo</b> groups your moves into <b>batches</b> and, once a batch fills, copies only its <b>first</b> direction. The other moves in the batch are discarded. Trace has batch size 4, so it acts once per 4 of your moves.</p>' +
      '<ul><li><b>Escape Together</b>: you and the required echoes must stand on the exit.</li>' +
      '<li><b>Escape Through the Echo</b>: use echoes as mechanisms (plates hold doors) and walk out.</li>' +
      '<li>Blocked moves of yours are not recorded. A blocked echo still uses up its batch.</li>' +
      '<li>Coins fill <b>Luck</b>; at 100 press <kbd>F</kbd> for Favour (smaller batches), followed by a cooldown.</li>' +
      '<li><b>Oracle</b> (<kbd>O</kbd>) previews the next move in each direction using the real simulation.</li></ul>' +
      '<p><kbd>←↑↓→</kbd>/<kbd>WASD</kbd> move · <kbd>Z</kbd> undo · <kbd>R</kbd> restart · <kbd>F</kbd> favour · <kbd>H</kbd> hop · <kbd>O</kbd> oracle · <kbd>M</kbd> levels</p>' +
      '<div class="row"><button id="o-close" class="on">Got it</button></div>');
    bind('o-close', closeOverlay);
  }

  /* ---------- rendering ---------- */
  function resize() {
    const avail = Math.max(240, $('stage').clientWidth - 18);
    ts = Math.max(28, Math.min(72, Math.floor(avail / L.w)));
    const dpr = window.devicePixelRatio || 1, w = ts * L.w, h = ts * L.h;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  const cx = (x) => x * ts + ts / 2;
  function poly(points) { ctx.beginPath(); points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  function shape(type, x, y, r) {
    ctx.beginPath();
    if (type === 'trace') ctx.arc(x, y, r, 0, Math.PI * 2);
    else if (type === 'flicker') poly([[x, y - r], [x + r, y + r * 0.8], [x - r, y + r * 0.8]]);
    else if (type === 'mason') ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
    else poly(Array.from({ length: 6 }, (_, i) => [x + r * Math.cos(i * Math.PI / 3), y + r * Math.sin(i * Math.PI / 3)]));
  }
  function text(t, x, y, size, color, align) {
    ctx.fillStyle = color; ctx.font = '700 ' + size + 'px system-ui,sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
  }

  function draw() {
    if (!L) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const hopE = hopMode ? hopper() : null;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const px = x * ts, py = y * ts;
      if (L.tiles[y][x] === '#') {
        ctx.fillStyle = '#252f52'; ctx.fillRect(px, py, ts, ts);
        ctx.strokeStyle = '#334071'; ctx.lineWidth = 1; ctx.strokeRect(px + 2.5, py + 2.5, ts - 5, ts - 5);
        continue;
      }
      ctx.fillStyle = (x + y) % 2 ? '#10172b' : '#0f1527'; ctx.fillRect(px, py, ts, ts);
      if (hopE && !AM.hopError(L, S, hopE, x, y)) {
        ctx.strokeStyle = '#7dffa0'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(px + 3, py + 3, ts - 6, ts - 6); ctx.setLineDash([]);
      }
    }
    drawExit(); drawPlatesDoors(); drawCoins(); drawBlocks(); drawEnemy();
    for (const h of S.helpers) { // helper: small diamond
      ctx.fillStyle = '#8cff9c'; poly([[cx(h.x), cx(h.y) - ts * 0.2], [cx(h.x) + ts * 0.2, cx(h.y)], [cx(h.x), cx(h.y) + ts * 0.2], [cx(h.x) - ts * 0.2, cx(h.y)]]); ctx.fill();
      text(h.state === 'PERFORM' ? String(h.hold) : String(h.life), cx(h.x), cx(h.y), ts * 0.2, '#0b0f1c');
    }
    for (const e of S.echoes) drawEcho(e);
    drawPlayer();
  }

  function drawExit() {
    if (!L.exit) return;
    const x = cx(L.exit.x), y = cx(L.exit.y), ready = AM.exitReady(L, S), r = ts * 0.36;
    ctx.lineWidth = 3;
    ctx.strokeStyle = ready ? '#7dffa0' : '#6b7699';
    ctx.setLineDash(ready ? [] : [4, 4]);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.rect(x - r + i * r * 0.28, y - r + i * r * 0.28, 2 * (r - i * r * 0.28), 2 * (r - i * r * 0.28)); ctx.stroke(); }
    ctx.setLineDash([]);
    if (!ready) { text('✕', x, y, ts * 0.3, '#6b7699'); }
    else { ctx.shadowColor = '#7dffa0'; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0; }
    text('EXIT', x, L.exit.y * ts + ts - 6, Math.max(8, ts * 0.17), ready ? '#7dffa0' : '#6b7699');
  }
  function drawPlatesDoors() {
    for (const k of Object.keys(L.plates)) {
      const [x, y] = k.split(',').map(Number), letter = L.plates[k], on = S.plateActive[letter];
      ctx.lineWidth = 3; ctx.strokeStyle = '#5ec8ff'; ctx.fillStyle = on ? '#2a6f95' : '#16213d';
      ctx.beginPath(); ctx.roundRect(x * ts + ts * 0.16, y * ts + ts * 0.16, ts * 0.68, ts * 0.68, 6); ctx.fill(); ctx.stroke();
      text(on ? '✓' + letter : letter, cx(x), cx(y), ts * 0.3, '#cfeeff');
    }
    for (const k of Object.keys(L.doors)) {
      const [x, y] = k.split(',').map(Number), letter = L.doors[k], open = S.open[letter], px = x * ts, py = y * ts;
      if (open) {
        ctx.strokeStyle = '#5ec8ff'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(px + 4, py + 4, ts - 8, ts - 8); ctx.setLineDash([]);
        text(letter, cx(x), cx(y), ts * 0.28, '#5ec8ff');
      } else {
        ctx.fillStyle = '#3a2540'; ctx.fillRect(px + 3, py + 3, ts - 6, ts - 6);
        ctx.strokeStyle = '#d27bff'; ctx.lineWidth = 3;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(px + 3, py + (ts * i) / 4); ctx.lineTo(px + ts - 3, py + (ts * i) / 4); ctx.stroke(); }
        text(letter, cx(x), cx(y), ts * 0.3, '#f1d5ff');
      }
    }
  }
  function drawCoins() {
    for (const c of S.coins) {
      const x = cx(c.x), y = cx(c.y);
      ctx.fillStyle = c.rare ? '#c49bff' : '#ffd35e';
      if (c.rare) { poly([[x, y - ts * 0.25], [x + ts * 0.2, y], [x, y + ts * 0.25], [x - ts * 0.2, y]]); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(x, y, ts * 0.16, 0, Math.PI * 2); ctx.fill(); text('+', x, y, ts * 0.2, '#6b5200'); }
    }
  }
  function drawBlocks() {
    for (const b of S.blocks) {
      const px = b.x * ts, py = b.y * ts, m = ts * 0.12;
      if (b.kind === 'push') {
        ctx.fillStyle = '#7a5a34'; ctx.fillRect(px + m, py + m, ts - 2 * m, ts - 2 * m);
        ctx.strokeStyle = '#d9b27a'; ctx.lineWidth = 2; ctx.strokeRect(px + m, py + m, ts - 2 * m, ts - 2 * m);
        ctx.beginPath(); ctx.moveTo(px + m, py + m); ctx.lineTo(px + ts - m, py + ts - m); ctx.moveTo(px + ts - m, py + m); ctx.lineTo(px + m, py + ts - m); ctx.stroke();
      } else {
        const corr = b.kind === 'corr';
        ctx.fillStyle = corr ? '#4a1f4f' : '#2d5b7a'; ctx.strokeStyle = corr ? '#ff6bd5' : '#8fd8ff';
        ctx.lineWidth = 2; ctx.setLineDash(corr ? [] : [3, 3]);
        ctx.fillRect(px + m, py + m, ts - 2 * m, ts - 2 * m); ctx.strokeRect(px + m, py + m, ts - 2 * m, ts - 2 * m); ctx.setLineDash([]);
        text((corr ? '✕' : '▤') + b.ttl, cx(b.x), cx(b.y), ts * 0.28, '#fff');
      }
    }
  }
  function drawEnemy() {
    const en = S.enemy; if (!en) return;
    const x = cx(en.x), y = cx(en.y), r = ts * 0.3;
    ctx.fillStyle = '#3a1020'; ctx.strokeStyle = '#ff6b7a'; ctx.lineWidth = 2.5;
    poly([[x, y - r], [x + r * 1.1, y], [x, y + r], [x - r * 1.1, y]]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = en.state === 'TELEGRAPH' ? '#ff6b7a' : '#a04a58'; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fill();
    if (en.state === 'TELEGRAPH' && en.target) {
      const t = en.target;
      ctx.strokeStyle = '#ff6b7a'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
      ctx.strokeRect(t.x * ts + 4, t.y * ts + 4, ts - 8, ts - 8); ctx.setLineDash([]);
      text('✕' + en.t, cx(t.x), cx(t.y), ts * 0.32, '#ff6b7a');
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx(t.x), cx(t.y)); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  function drawEcho(e) {
    const col = COLORS[e.type], r = ts * 0.3;
    // ghost at hop origin
    if (e.hopping && e.hop.origin) {
      ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3]); ctx.lineWidth = 2;
      shape(e.type, cx(e.hop.origin.x), cx(e.hop.origin.y), r); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    const ox = S.echoes.filter((q) => q.x === e.x && q.y === e.y && q.id < e.id).length * (ts * 0.14);
    const x = cx(e.x) + ox, y = cx(e.y) - ox * 0.5;
    if (e.state === 'FAVOURED') { ctx.strokeStyle = '#ffd35e'; ctx.lineWidth = 3; shape(e.type, x, y, r + 5); ctx.stroke(); }
    if (e.state === 'COOLDOWN') { ctx.strokeStyle = '#9aa6c8'; ctx.lineWidth = 2; ctx.setLineDash([2, 3]); shape(e.type, x, y, r + 5); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = '#0b1226'; shape(e.type, x, y, r); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = e.required ? 4 : 2.5; shape(e.type, x, y, r); ctx.stroke();
    text(AM.ARCHETYPES[e.type].glyph, x, y + (e.type === 'flicker' ? 3 : 0), ts * 0.28, col);
    // batch head arrow + progress pips
    const b = e.counter === 0 ? e.activeB : e.activeB;
    if (e.batch.length) text(AM.ARROW[e.batch[0]], x, cx(e.y) - ts * 0.43, ts * 0.24, '#fff');
    const pw = Math.min(ts * 0.12, (ts * 0.7) / b);
    for (let i = 0; i < b; i++) {
      ctx.fillStyle = i < e.counter ? col : '#33406a';
      ctx.fillRect(cx(e.x) - (b * pw) / 2 + i * pw + 1, e.y * ts + ts - 7, pw - 2, 4);
    }
  }
  function drawPlayer() {
    const x = cx(S.player.x), y = cx(S.player.y);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, ts * 0.27, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0b0f1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, ts * 0.1, 0, Math.PI * 2); ctx.stroke();
  }

  /* ---------- side panel ---------- */
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function refresh() {
    $('hudMoves').textContent = S.moves;
    $('hudLimit').textContent = L.maxMoves ? ' / ' + L.maxMoves : '';
    $('luckFill').style.width = S.luck + '%'; $('luckNum').textContent = S.luck;
    const fr = AM.favourReady(S);
    $('btnFavour').disabled = S.status !== 'play'; $('btnFavour').classList.toggle('ready', fr);
    $('btnHop').disabled = !S.echoes.some((e) => e.hop) || S.status !== 'play'; $('btnHop').classList.toggle('on', hopMode);
    $('btnUndo').disabled = !undo.length;

    $('echoes').innerHTML = S.echoes.length ? S.echoes.map((e) => {
      const a = AM.ARCHETYPES[e.type], col = COLORS[e.type], st = e.hopping ? 'HOPPING' : e.state;
      const pips = '▮'.repeat(e.counter) + '▯'.repeat(Math.max(0, e.activeB - e.counter));
      const buf = e.batch.map((d, i) => '<span class="' + (i === 0 ? 'head' : '') + '">' + AM.ARROW[d] + '</span>').join('') || '<span>–</span>';
      let extra = '';
      if (e.favour && st === 'FAVOURED') extra += ' · favour ' + e.favour + ' left';
      if (e.state === 'COOLDOWN') extra += ' · cooldown ' + e.cooldown;
      if (e.hopping) extra += ' · returns in ' + e.hop.hold;
      if (a.charges) extra += ' · charges ' + e.charges;
      if (e.hop) extra += ' · hop ' + e.hop.charges;
      return '<div class="echo" style="--c:' + col + '" title="' + esc(a.role) + '"><b>' + a.name + '</b> #' + e.id +
        (e.required ? '<span class="tag">required</span>' : '') +
        '<div class="pips">' + pips + ' <span class="dim">' + e.counter + '/' + e.activeB + ' (base ' + e.B + ')</span></div>' +
        '<div class="buf">batch: ' + buf + ' <span class="dim">→ acts on first</span></div>' +
        '<div class="st-' + st + '">' + st + extra + '</div></div>';
    }).join('') : '<p class="dim">No echoes in this level.</p>';

    $('log').innerHTML = log.slice(0, 12).map((l) => '<li class="' + l.c + '">' + esc(l.t) + '</li>').join('');
    $('oracleBox').hidden = !oracleOn;
    if (oracleOn && S.status === 'play') {
      $('oracle').innerHTML = AM.oracle(L, S).map((o) => {
        const lab = AM.ARROW[o.dir] + ' ' + o.dir;
        if (!o.accepted) return '<div class="no">' + lab + ': blocked</div>';
        return '<div class="' + (o.status === 'won' ? 'win' : '') + '">' + lab + ': ' + (o.notes.length ? esc(o.notes.join(' ')) : 'nothing happens') + '</div>';
      }).join('');
    } else $('oracle').innerHTML = '';
    draw();
  }

  /* ---------- input ---------- */
  const KEYS = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT', W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT' };
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (!isOverlayClosed()) {
      if (k === 'Escape') closeOverlay();
      else if ((k === 'n' || k === 'N' || k === 'Enter') && S.status === 'won' && $('o-next')) start(idx + 1);
      else if ((k === 'r' || k === 'R') && S.status === 'lost') restart();
      return;
    }
    if (KEYS[k]) { ev.preventDefault(); move(KEYS[k]); }
    else if (k === 'z' || k === 'Z' || k === 'u' || k === 'U' || k === 'Backspace') { ev.preventDefault(); undoMove(); }
    else if (k === 'r' || k === 'R') restart();
    else if (k === 'f' || k === 'F') favour();
    else if (k === 'h' || k === 'H') toggleHop();
    else if (k === 'o' || k === 'O') { oracleOn = !oracleOn; $('btnOracle').setAttribute('aria-pressed', oracleOn); refresh(); }
    else if (k === 'm' || k === 'M') menu();
    else if (k === 'Escape' && hopMode) { hopMode = false; refresh(); }
  });
  document.querySelectorAll('.dpad button').forEach((b) => b.addEventListener('click', () => move(b.dataset.dir)));
  $('btnUndo').onclick = undoMove; $('btnRestart').onclick = restart; $('btnFavour').onclick = favour; $('btnHop').onclick = toggleHop;
  $('btnOracle').onclick = () => { oracleOn = !oracleOn; $('btnOracle').setAttribute('aria-pressed', oracleOn); refresh(); };
  $('btnMenu').onclick = menu; $('btnHelp').onclick = help;
  cv.addEventListener('click', (ev) => {
    if (!hopMode) return;
    const r = cv.getBoundingClientRect(), x = Math.floor((ev.clientX - r.left) / ts), y = Math.floor((ev.clientY - r.top) / ts);
    const e = hopper(); if (!e) return;
    const res = AM.hop(L, S, e.id, x, y);
    if (res.ok) commit(res.state, res.events); else { addLog(res.events); refresh(); }
  });
  window.addEventListener('resize', () => L && resize());

  // first visit: show help once
  start(0);
  if (!Object.keys(save.best).length) help();
})();
