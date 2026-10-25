/* Aftermotion app: screens, DOM board renderer, effects and input.
 * Rules live in engine.js, rewards in progress.js; this file only presents state and sends commands. */
(function () {
  'use strict';
  const AM = window.AM, LEVELS = window.AMLevels, P = window.AMProgress, SFX = window.AMAudio;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const ROT = { UP: 0, RIGHT: 90, DOWN: 180, LEFT: 270 };
  const ARROW = (dir, cls) => '<svg class="' + (cls || '') + '" style="transform:rotate(' + ROT[dir] + 'deg)"><use href="#i-arrow"/></svg>';
  const STAR = '<svg><use href="#i-star"/></svg>';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);

  const ECHO_INFO = {
    trace: { name: 'Trace', glyph: 'T', color: '#ffc24b', b: 4, sel: 'First move', verb: 'Walk', role: 'Copies the first move of every 4.', tips: ['Plan the first move of each batch; the other three are free.', 'A blocked attempt still uses up the batch, so walls let Trace wait.'] },
    flicker: { name: 'Flicker', glyph: 'F', color: '#c49bff', b: 2, sel: 'First move', verb: 'Walk + Hop', role: 'Copies the first move of every 2. Can hop.', tips: ['Twice as responsive as Trace, so it drifts quickly.', 'Press H and tap a glowing tile: Flicker hops there (even over walls), holds it for 4 moves, then returns.'] },
    mason: { name: 'Mason', glyph: 'M', color: '#ff9a5e', b: 4, sel: 'First move', verb: 'Build', role: 'Builds a temporary block where its batch head points.', tips: ['Mason never walks. Aim the first move of a batch at the tile you want built.', 'A block on a plate holds its door until the block expires.'] },
    keeper: { name: 'Keeper', glyph: 'K', color: '#6dffb3', b: 3, sel: 'Any', verb: 'Send helper', role: 'Every 3 moves, sends a helper to the nearest free plate.', tips: ['Helpers walk on their own and hold a plate for 6 moves.', 'If a helper cannot arrive in time, it fades away.'] },
    blocker: { name: 'Blocker', glyph: '!', color: '#ff5c8a', b: 0, sel: '—', verb: 'Corrupt', role: 'Hostile. Telegraphs a tile, then drops a corruption block on it.', tips: ['The red reticle shows where and when it strikes.', 'Corruption fades after 6 moves.'], hostile: true },
  };
  const firstLevelWith = (key) => {
    const ch = { trace: 'T', flicker: 'F', mason: 'M', keeper: 'K', blocker: 'Z' }[key];
    const l = LEVELS.find((d) => d.map.some((r) => r.includes(ch)));
    return l ? l.id : null;
  };

  let prog = P.load();
  let screen = 'title', G = null, mapSel = null, echoSel = 'trace';
  const board = $('#board'), frame = $('#frame');
  let tileEls = [], actorsEl = null, actorEls = new Map(), checkToken = 0;

  const reduced = () => prog.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anim = (el, frames, opts) => { if (!el || reduced() || !el.animate) return null; return el.animate(frames, Object.assign({ duration: 200, easing: 'ease-out' }, opts)); };
  const buzz = (ms) => { try { if (!reduced() && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* unsupported */ } };
  function persist() { P.save(prog); }
  function coins() { $$('.coinCount').forEach((el) => (el.textContent = prog.coins.toLocaleString('en-US'))); }
  function applySettings() { SFX.setEnabled(!!prog.sound); document.body.classList.toggle('reduce', !!prog.reduceMotion); }

  /* ================= screens ================= */
  function show(name) {
    screen = name;
    $$('.screen').forEach((s) => (s.hidden = s.id !== name));
    closeModal();
    coins();
    if (name === 'title') renderTitle();
    if (name === 'map') renderMap();
    if (name === 'echoes') renderEchoes();
    window.scrollTo(0, 0);
  }

  function renderTitle() {
    const done = LEVELS.filter((l) => prog.levels[l.id] && prog.levels[l.id].clears).length;
    const next = P.nextLevelIndex(prog, LEVELS);
    $('#tContinueLabel').textContent = done === 0 ? 'Play' : done === LEVELS.length ? 'Replay · Level ' + LEVELS[next].id : 'Continue · Level ' + LEVELS[next].id;
    $('#tStarCount').textContent = P.totalStars(prog);
    $('#tStars').textContent = P.totalStars(prog) + ' / ' + LEVELS.length * 3 + '★';
    const seen = Object.keys(ECHO_INFO).filter((k) => prog.seen[k]).length;
    $('#tEchoes').textContent = seen + ' / ' + Object.keys(ECHO_INFO).length;
  }

  /* ---------- map ---------- */
  function mapPoints() {
    const xs = [130, 375, 625, 870], pts = [];
    for (let i = 0; i < LEVELS.length + 1; i++) {
      const row = Math.floor(i / 4), col = i % 4, c = row % 2 ? 3 - col : col;
      pts.push({ x: xs[c], y: 95 + row * 210 + Math.sin(i * 1.7) * 14 });
    }
    return pts;
  }
  function levelChips(def) {
    const s = def.map.join(''), out = [];
    if (s.includes('T')) out.push('Trace'); if (s.includes('F')) out.push('Flicker'); if (s.includes('M')) out.push('Mason'); if (s.includes('K')) out.push('Keeper');
    if (/[a-d]/.test(s)) out.push('Plate + door'); if (s.includes('o')) out.push('Push block'); if (s.includes('c')) out.push('Coins'); if (s.includes('Z')) out.push('Blocker');
    if (def.maxMoves) out.push(def.maxMoves + ' move limit');
    out.push(def.mode === 'together' ? 'Escape together' : 'Escape through');
    return out;
  }
  function renderMap() {
    const pts = mapPoints(), cur = P.nextLevelIndex(prog, LEVELS);
    if (mapSel === null) mapSel = cur;
    const toPct = (p) => ({ left: p.x / 10 + '%', top: (p.y / 620) * 100 + '%' });
    const d = (arr) => arr.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y.toFixed(0)).join(' ');
    $('#mapPathAll').setAttribute('d', d(pts));
    const doneCount = LEVELS.filter((l) => prog.levels[l.id] && prog.levels[l.id].clears).length;
    $('#mapPathDone').setAttribute('d', d(pts.slice(0, Math.min(doneCount, LEVELS.length - 1) + 1)));
    let html = '';
    LEVELS.forEach((l, i) => {
      const rec = prog.levels[l.id], unlocked = P.isUnlocked(prog, LEVELS, i), p = toPct(pts[i]);
      const cls = 'node' + (!unlocked ? ' locked' : i === cur && !(rec && rec.clears) ? ' cur' : '') + (i === mapSel ? ' sel' : '');
      const stars = rec && rec.clears ? '<span class="nstars">' + [1, 2, 3].map((k) => '<svg style="fill:' + (k <= rec.stars ? 'var(--gold)' : 'transparent') + '"><use href="#i-star"/></svg>').join('') + '</span>' : '';
      html += '<button class="' + cls + '" data-i="' + i + '" style="left:' + p.left + ';top:' + p.top + '" aria-label="Level ' + l.id + (unlocked ? '' : ' (locked)') + '">' +
        (unlocked ? l.id : '<svg><use href="#i-lock"/></svg>') + stars + '</button>';
    });
    const fp = toPct(pts[LEVELS.length]);
    html += '<div class="node future" style="left:' + fp.left + ';top:' + fp.top + '"><svg><use href="#i-lock"/></svg>World 2</div>';
    const ap = toPct(pts[cur]);
    html += '<div class="avatar" style="left:' + ap.left + ';top:' + ap.top + '"></div>';
    $('#mapNodes').innerHTML = html;
    $$('#mapNodes .node[data-i]').forEach((b) => (b.onclick = () => {
      const i = +b.dataset.i;
      if (!P.isUnlocked(prog, LEVELS, i)) { toast('Clear level ' + LEVELS[i - 1].id + ' to unlock this one.'); SFX.echoBlocked(); return; }
      SFX.click();
      if (mapSel === i) startLevel(i); else { mapSel = i; renderMap(); }
    }));
    renderMapInfo();
  }
  function renderMapInfo() {
    const i = mapSel, l = LEVELS[i], rec = prog.levels[l.id], unlocked = P.isUnlocked(prog, LEVELS, i);
    const base = P.baseReward(l), coinsIn = l.map.join('').split('').filter((c) => c === 'c' || c === '*').length;
    const maxFirst = Math.round(base * 1.5) + Math.round(base * 1.5 * 0.1) + coinsIn * P.RULES.coinValue;
    $('#mapInfo').innerHTML =
      '<h3>Level ' + l.id + '</h3><div class="lvl-name">' + esc(l.name) + '</div>' +
      '<div class="stars-row">' + [1, 2, 3].map((k) => '<svg style="fill:' + (rec && k <= rec.stars ? 'var(--gold)' : 'transparent') + '"><use href="#i-star"/></svg>').join('') + '</div>' +
      '<div class="chips">' + levelChips(l).map((c) => '<span class="chip">' + esc(c) + '</span>').join('') + '</div>' +
      '<p class="dim small" style="margin:0">' + esc(l.intro) + '</p>' +
      '<div class="small">Par <b>' + (l.par || '—') + '</b>' + (rec && rec.best !== null ? ' · Best <b>' + rec.best + '</b>' : '') + '</div>' +
      '<div class="small dim">' + (rec && rec.clears ? esc(P.nextReplayInfo(P.record(prog, l.id), Date.now())) : 'First clear pays up to ' + maxFirst + ' coins.') + '</div>' +
      '<button class="btn gold big" id="mapPlay"' + (unlocked ? '' : ' disabled') + '><svg><use href="#i-play"/></svg>' + (unlocked ? (rec && rec.clears ? 'Replay' : 'Play') : 'Locked') + '</button>';
    $('#mapPlay').onclick = () => startLevel(i);
  }

  /* ---------- echoes ---------- */
  function renderEchoes() {
    const keys = Object.keys(ECHO_INFO), seen = keys.filter((k) => prog.seen[k]).length;
    $('#eCount').textContent = seen + ' OF ' + keys.length + ' DISCOVERED';
    let html = '<div class="section-label">ALLIES</div>';
    keys.forEach((k) => {
      const e = ECHO_INFO[k], known = !!prog.seen[k];
      if (k === 'blocker') html += '<div class="section-label">HOSTILES</div>';
      html += '<button class="ecard-btn' + (known ? '' : ' locked') + (echoSel === k ? ' sel' : '') + '" data-k="' + k + '">' +
        '<div class="glyph ' + k + '"><span>' + (known ? e.glyph : '?') + '</span></div><b>' + (known ? e.name : '???') + '</b>' +
        '<small style="color:' + (known ? 'var(--mint)' : 'var(--dim)') + '">' + (known ? (e.hostile ? 'Hostile' : 'Batch ' + e.b) : 'Meet in level ' + firstLevelWith(k)) + '</small></button>';
    });
    $('#echoGrid').innerHTML = html;
    $$('#echoGrid .ecard-btn').forEach((b) => (b.onclick = () => { echoSel = b.dataset.k; SFX.click(); renderEchoes(); }));
    const e = ECHO_INFO[echoSel], known = !!prog.seen[echoSel];
    $('#echoDetail').innerHTML = known
      ? '<div class="echo-hero"><div class="orbit"><div class="glyph ' + echoSel + '" style="--g:92px"><span>' + e.glyph + '</span></div></div><div><div class="disp" style="font-size:32px;color:' + e.color + '">' + e.name + '</div><div class="small" style="color:#d9d3ff">' + esc(e.role) + '</div></div></div>' +
        '<div class="stat-grid"><div class="stat"><span>COPIES</span><b>' + e.sel + '</b></div><div class="stat"><span>ACTION</span><b>' + e.verb + '</b></div>' +
        '<div class="stat"><span>BATCH</span><b>' + (e.b ? e.b + ' moves' : '—') + '</b></div><div class="stat"><span>FIRST SEEN</span><b>Level ' + firstLevelWith(echoSel) + '</b></div></div>' +
        '<h3 style="margin:4px 0 0">Tips</h3><ul class="help-list">' + e.tips.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
        '<p class="small dim" style="margin:0">Upgrades and new echoes arrive with future worlds.</p>'
      : '<div class="echo-hero"><div class="orbit"><div class="glyph ' + echoSel + '" style="--g:92px;filter:grayscale(1) brightness(.4)"><span>?</span></div></div><div><div class="disp" style="font-size:30px">Undiscovered</div><div class="small dim">Reach level ' + firstLevelWith(echoSel) + ' to meet this one.</div></div></div>';
  }

  /* ================= game ================= */
  function startLevel(i, opts) {
    const def = LEVELS[i], r = AM.loadLevel(def);
    G = { idx: i, def, L: r.level, S: r.state, undo: [], log: [], hop: false, oracle: G ? G.oracle : false, usedHint: false, hint: null, trail: [], startCoins: r.state.coins.length };
    r.state.echoes.forEach((e) => (prog.seen[e.type] = true));
    if (r.state.enemy) prog.seen.blocker = true;
    persist();
    show('game');
    $('#gWorld').textContent = 'WORLD 1 · FIRST LIGHT · LEVEL ' + def.id;
    $('#gName').textContent = def.name;
    buildBoard(); buildCards(); fit();
    const tip = $('#tip');
    if (!(opts && opts.restart)) {
      tip.innerHTML = '<div><b>' + esc(def.name) + '</b><p>' + esc(def.intro) + '</p></div><button id="tipOk">Go!</button>';
      tip.hidden = false;
      $('#tipOk').onclick = () => (tip.hidden = true);
    } else tip.hidden = true;
    addLog([{ text: 'Level start. Your moves feed every echo\'s batch.' }]);
    render(true);
  }

  function buildBoard() {
    const L = G.L;
    board.innerHTML = ''; tileEls = []; actorEls = new Map();
    board.style.setProperty('--w', L.w);
    board.classList.remove('stuck-fx'); $('#stuck').hidden = true;
    for (let y = 0; y < L.h; y++) {
      const row = [];
      for (let x = 0; x < L.w; x++) {
        const el = document.createElement('div'), k = AM.key(x, y);
        el.dataset.x = x; el.dataset.y = y;
        let cls = 'tile ' + (L.tiles[y][x] === '#' ? 'wall' : 'floor' + ((x + y) % 2 ? ' alt' : ''));
        let lbl = '';
        if (L.plates[k]) { cls += ' plate'; lbl = L.plates[k].toLowerCase(); }
        if (L.doors[k]) { cls = 'tile floor door'; lbl = L.doors[k]; }
        if (AM.isExit(L, x, y)) cls += ' exit';
        el.className = cls;
        if (lbl) el.innerHTML = '<span class="lbl">' + lbl + '</span>';
        board.appendChild(el); row.push(el);
      }
      tileEls.push(row);
    }
    actorsEl = document.createElement('div'); actorsEl.className = 'actors'; board.appendChild(actorsEl);
  }

  function fit() {
    if (!G) return;
    const L = G.L, narrow = window.innerWidth <= 980;
    const availW = $('#stage').clientWidth - 24;
    const availH = narrow ? window.innerHeight * 0.58 : window.innerHeight - 240;
    const ts = Math.max(24, Math.floor(Math.min(availW / L.w, availH / L.h, 66)));
    board.style.setProperty('--ts', ts + 'px');
  }

  /* ---------- keyed actor sync ---------- */
  function actor(key, cls, html, x, y, seen) {
    seen.add(key);
    let el = actorEls.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'actor instant ' + cls; el.innerHTML = html;
      actorsEl.appendChild(el); actorEls.set(key, el);
      el.style.transform = 'translate(' + x * 100 + '%,' + y * 100 + '%)';
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('instant')));
      anim(el, [{ opacity: 0, transform: el.style.transform + ' scale(.4)' }, { opacity: 1, transform: el.style.transform }], { duration: 220, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      el._new = true;
    } else {
      el._new = false;
      el.className = 'actor ' + cls + (el.classList.contains('instant') ? ' instant' : '');
      el.style.transform = 'translate(' + x * 100 + '%,' + y * 100 + '%)';
    }
    return el;
  }
  function sweep(seen) {
    for (const [k, el] of actorEls) {
      if (seen.has(k)) continue;
      actorEls.delete(k);
      const a = anim(el, [{ opacity: 1 }, { opacity: 0, transform: el.style.transform + ' scale(.3)' }], { duration: 220 });
      if (a) a.onfinish = () => el.remove(); else el.remove();
    }
  }

  function render(instant) {
    const L = G.L, S = G.S, seen = new Set();
    if (instant) for (const el of actorEls.values()) el.classList.add('instant');
    // tiles
    const ready = AM.exitReady(L, S), hopE = G.hop ? hopper() : null;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const el = tileEls[y][x], k = AM.key(x, y);
      if (L.plates[k]) el.classList.toggle('on', !!S.plateActive[L.plates[k]]);
      if (L.doors[k]) el.classList.toggle('open', !!S.open[L.doors[k]]);
      if (AM.isExit(L, x, y)) el.classList.toggle('locked', !ready);
      el.classList.toggle('hopok', !!hopE && L.tiles[y][x] !== '#' && !AM.hopError(L, S, hopE, x, y));
    }
    // actors
    S.coins.forEach((c) => actor('coin' + c.x + ',' + c.y, 'coinA', '<div class="coin' + (c.rare ? ' rare' : '') + '"></div>', c.x, c.y, seen));
    let pi = 0;
    for (const b of S.blocks) {
      if (b.kind === 'push') actor('push' + pi++, 'blockA', '<div class="crate"></div>', b.x, b.y, seen);
      else {
        const el = actor(b.kind + b.x + ',' + b.y, 'blockA', '<div class="' + (b.kind === 'temp' ? 'tblock' : 'cblock') + '"><span></span></div>', b.x, b.y, seen);
        el.querySelector('span').textContent = b.ttl;
      }
    }
    if (S.enemy) {
      const en = S.enemy;
      actor('enemy', 'enemy' + (en.state === 'TELEGRAPH' ? ' armed' : ''), '<div class="gem"></div><div class="eye"></div>', en.x, en.y, seen);
      if (en.state === 'TELEGRAPH' && en.target) actor('tele', 'tele', '<div class="ret"></div><b></b>', en.target.x, en.target.y, seen).querySelector('b').textContent = en.t;
    }
    for (const h of S.helpers) actor('helper' + h.id, 'helper', '<div class="dia"></div><b></b>', h.x, h.y, seen).querySelector('b').textContent = h.state === 'PERFORM' ? h.hold : h.life;
    G.trail.forEach((p, i) => { const el = actor('trail' + i, 'trail', '<div class="dot"></div>', p.x, p.y, seen); el.style.opacity = 0.32 - i * 0.1; el.firstChild.style.transform = 'scale(' + (1 - i * 0.22) + ')'; });
    for (const e of S.echoes) {
      if (e.hopping && e.hop.origin) actor('ghost' + e.id, 'echo ghost-origin ' + e.type, '<div class="shape"><span>' + ECHO_INFO[e.type].glyph + '</span></div>', e.hop.origin.x, e.hop.origin.y, seen);
      const el = actor('echo' + e.id, 'echo ' + e.type + (e.required ? ' required' : '') + (e.state === 'FAVOURED' ? ' fav' : '') + (e.state === 'COOLDOWN' ? ' cool' : ''),
        '<div class="shape"><span>' + ECHO_INFO[e.type].glyph + '</span></div><div class="pips"></div><svg class="head"><use href="#i-arrow"/></svg>', e.x, e.y, seen);
      el.style.setProperty('--c', ECHO_INFO[e.type].color);
      const size = e.counter === 0 ? AM.batchSize(e) : e.activeB;
      const pips = el.querySelector('.pips');
      if (pips.childElementCount !== size) pips.innerHTML = '<i></i>'.repeat(size);
      Array.from(pips.children).forEach((p, i) => p.classList.toggle('on', i < e.counter));
      const head = el.querySelector('.head');
      head.style.display = e.batch.length && e.type !== 'keeper' ? '' : 'none';
      if (e.batch.length) head.style.transform = 'rotate(' + ROT[e.batch[0]] + 'deg)';
    }
    actor('player', 'playerA', '<div class="orb-bob"><div class="orb"></div></div>', S.player.x, S.player.y, seen);
    // hint marker
    if (G.hint) {
      const a = G.hint;
      if (a.k === 'move') { const d = AM.DELTA[a.d]; actor('hint', 'hintArrow', ARROW(a.d), S.player.x + d[0], S.player.y + d[1], seen).innerHTML = ARROW(a.d); }
      else if (a.k === 'hop') actor('hint', 'hintArrow', '<div class="hintTile"></div>', a.x, a.y, seen);
    }
    sweep(seen);
    renderPanel();
  }

  function hopper() { return G.S.echoes.find((e) => e.hop && !e.hopping && e.hop.charges > 0 && e.state !== 'COOLDOWN'); }

  /* ---------- side panel ---------- */
  function buildCards() {
    $('#echoCards').innerHTML = G.S.echoes.map((e) => {
      const info = ECHO_INFO[e.type];
      return '<div class="ecard" data-id="' + e.id + '" style="--c:' + info.color + '"><div class="ecard-top"><div class="glyph ' + e.type + '"><span>' + info.glyph + '</span></div>' +
        '<div><b>' + info.name + '</b><small>' + esc(info.role) + '</small></div>' + (e.required ? '<span class="etag">REQUIRED</span>' : '') + '</div>' +
        '<div class="tape"></div><div class="estatus"></div></div>';
    }).join('');
  }
  function renderPanel() {
    const L = G.L, S = G.S;
    for (const e of S.echoes) {
      const card = $('#echoCards .ecard[data-id="' + e.id + '"]'); if (!card) continue;
      const tape = card.querySelector('.tape'), size = e.counter === 0 ? AM.batchSize(e) : e.activeB;
      if (tape.childElementCount !== size) tape.innerHTML = '<div class="slot"></div>'.repeat(size);
      Array.from(tape.children).forEach((slot, i) => {
        const d = e.batch[i];
        slot.classList.toggle('filled', !!d);
        slot.classList.toggle('head', !!d && i === 0 && e.type !== 'keeper');
        if (d && slot.dataset.d !== d) { slot.innerHTML = ARROW(d); slot.dataset.d = d; }
        if (!d && slot.dataset.d) { slot.innerHTML = ''; delete slot.dataset.d; }
      });
      const st = e.hopping ? 'HOPPING' : e.state;
      let txt = '<span class="' + st + '">' + (st === 'NORMAL' ? '' : st + ' · ') + '</span>';
      if (e.hopping) txt += 'returns in ' + e.hop.hold;
      else if (e.state === 'FAVOURED') txt += e.favour + ' moves of favour left · ';
      else if (e.state === 'COOLDOWN') txt += 'recovers in ' + e.cooldown + ' · ';
      if (!e.hopping) { const left = size - e.counter; txt += 'acts in ' + left + ' move' + (left === 1 ? '' : 's'); }
      if (e.type === 'mason' || e.type === 'keeper') txt += ' · ' + e.charges + ' charges';
      if (e.hop) txt += ' · hop ' + e.hop.charges;
      card.querySelector('.estatus').innerHTML = txt;
    }
    // header
    const par = L.par, stars = P.starsFor(S.moves, par), lim2 = par ? P.twoStarLimit(par) : 0;
    $('#gStars').innerHTML = [1, 2, 3].map((k) => '<svg class="' + (k <= stars ? 'lit' : '') + '"><use href="#i-star"/></svg>').join('');
    $('#gParFill').style.width = par ? Math.min(100, (S.moves / lim2) * 100) + '%' : '0';
    $('#gStarHint').textContent = !par ? '' : S.moves <= par ? (par - S.moves) + ' moves left for ★★★' : S.moves <= lim2 ? (lim2 - S.moves) + ' moves left for ★★' : 'Finish for ★';
    $('#gMoves').textContent = S.moves;
    $('#gMovesOf').textContent = L.maxMoves ? ' / ' + L.maxMoves : par ? ' · par ' + par : '';
    $('.moves').classList.toggle('low', !!L.maxMoves && L.maxMoves - S.moves <= 3);
    coins();
    // goals
    const g = [], req = S.echoes.filter((e) => e.required);
    const doors = [...new Set(Object.values(L.doors))];
    doors.forEach((d) => g.push({ done: !!S.open[d], text: 'Open door ' + d + ' (hold plate ' + d.toLowerCase() + ')' }));
    if (L.exitLock.length) g.push({ done: AM.exitReady(L, S), text: 'Power the portal' });
    req.forEach((e) => g.push({ done: !e.hopping && AM.isExit(L, e.x, e.y), text: 'Bring ' + ECHO_INFO[e.type].name + ' to the portal' }));
    g.push({ done: S.status === 'won', text: req.length ? 'Reach the portal together' : 'Reach the portal' });
    if (L.maxMoves) g.push({ done: false, text: 'Finish within ' + L.maxMoves + ' moves (' + (L.maxMoves - S.moves) + ' left)' });
    const total = G.startCoins, got = total - S.coins.length;
    if (total) g.push({ done: got === total, text: 'Coins ' + got + ' / ' + total + ' (optional)' });
    $('#goals').innerHTML = g.map((q) => '<div class="goal' + (q.done ? ' done' : '') + '"><i>' + (q.done ? '✓' : '') + '</i>' + esc(q.text) + '</div>').join('');
    // buttons
    const hasLuck = G.startCoins > 0 || L.luck0 > 0;
    $('#btnFavour').hidden = !hasLuck || !S.echoes.length;
    $('#btnFavour').style.setProperty('--p', S.luck);
    $('#btnFavour').classList.toggle('ready', AM.favourReady(S));
    $('#btnFavour').title = 'Favour (F) · Luck ' + S.luck + '/100';
    $('#btnHop').hidden = !S.echoes.some((e) => e.hop);
    $('#btnHop').classList.toggle('on', G.hop);
    $('#btnHop').disabled = !hopper() && !G.hop;
    $('#btnUndo').disabled = !G.undo.length;
    $('#btnOracle').classList.toggle('on', G.oracle);
    $('#btnOracle').setAttribute('aria-pressed', G.oracle);
    const price = P.hintPrice(prog, today());
    $('#hintLabel').textContent = price ? 'Hint · ' + price : 'Hint · free';
    // oracle
    $('#oracleCard').hidden = !G.oracle || S.status !== 'play';
    if (G.oracle && S.status === 'play') {
      $('#oracleList').innerHTML = AM.oracle(L, S).map((o) => {
        if (!o.accepted) return '<div class="no">' + ARROW(o.dir) + '<span>Blocked</span></div>';
        return '<div class="' + (o.status === 'won' ? 'win' : '') + '">' + ARROW(o.dir) + '<span>' + esc(o.notes.length ? o.notes.join(' ') : 'Nothing else happens.') + '</span></div>';
      }).join('');
    }
    // feed
    $('#feed').innerHTML = G.log.slice(0, 6).map((l) => '<li class="' + l.c + '">' + esc(l.t) + '</li>').join('');
  }
  function addLog(events) {
    for (const e of events) {
      const t = e.text, c = /Blocked|cannot|refused|missed|Out of|blocked/.test(t) ? 'bad' : /complete|holds|Coin|Fragment/.test(t) ? 'good' : /Favour|moves|builds/.test(t) ? 'gold' : '';
      G.log.unshift({ t, c });
    }
    G.log = G.log.slice(0, 30);
  }

  /* ---------- commands ---------- */
  const busy = () => !$('#overlay').hidden || screen !== 'game' || !G;
  function move(dir) {
    if (busy() || G.S.status !== 'play') return;
    if (G.hop) { G.hop = false; }
    const r = AM.step(G.L, G.S, dir);
    if (!r.accepted) { fxBlocked(dir); addLog(r.events); renderPanel(); return; }
    G.trail = [{ x: G.S.player.x, y: G.S.player.y }].concat(G.trail).slice(0, 3);
    commit(r.state, r.events, { kind: 'move', dir });
  }
  function commit(next, events, meta) {
    const prev = G.S;
    G.undo.push({ S: prev, trail: G.trail.slice(1) });
    if (G.undo.length > 400) G.undo.shift();
    G.S = next; G.hint = null; $('#tip').hidden = true;
    addLog(events);
    render();
    fx(prev, next, events, meta);
    if (next.status === 'won') setTimeout(victory, reduced() ? 50 : 650);
    else if (next.status === 'lost') setTimeout(failed, 350);
    else checkStuck();
  }
  function undo() {
    if (busy() || !G.undo.length) return;
    const u = G.undo.pop(); G.S = u.S; G.trail = u.trail; G.hint = null; G.hop = false;
    addLog([{ text: 'Rewound one move.' }]);
    SFX.undo(); render(); checkStuck();
  }
  function restart() { if (G) { SFX.undo(); startLevel(G.idx, { restart: true }); } }
  function favour() {
    if (busy()) return;
    const r = AM.activateFavour(G.L, G.S);
    if (!r.ok) { toast(r.events[0].text); SFX.echoBlocked(); return; }
    SFX.favour(); commit(r.state, r.events, { kind: 'favour' });
    anim(frame, [{ boxShadow: '0 0 0 3px #ffc24b, 0 0 60px #ffc24b' }, { boxShadow: '0 0 0 3px #2c2266, 0 18px 40px #00000080' }], { duration: 700 });
  }
  function toggleHop() {
    if (busy() || G.S.status !== 'play') return;
    if (G.hop) G.hop = false;
    else if (hopper()) { G.hop = true; toast('Tap a glowing tile to hop. Esc cancels.'); }
    else { toast('No echo can hop right now.'); return; }
    SFX.click(); render();
  }
  function tryHop(x, y) {
    const e = hopper(); if (!e) return;
    const r = AM.hop(G.L, G.S, e.id, x, y);
    if (!r.ok) { toast(r.events[0].text); SFX.echoBlocked(); return; }
    G.hop = false; SFX.hop(); commit(r.state, r.events, { kind: 'hop' });
  }
  function toggleOracle() { if (busy()) return; G.oracle = !G.oracle; SFX.click(); renderPanel(); }
  function hint() {
    if (busy() || G.S.status !== 'play') return;
    const price = P.hintPrice(prog, today());
    if (price > prog.coins) { toast('Hints cost ' + price + ' coins after the free daily one.'); SFX.echoBlocked(); return; }
    const r = AM.canWin(G.L, G.S, { ms: 900, cap: 300000 });
    if (r.result === 'unknown') { toast('Too many possibilities to hint from here. Try a few moves first.'); return; }
    if (r.result === 'stuck') { toast('No solution from this position. Undo first.'); return; }
    const c = P.chargeHint(prog, today()); persist();
    G.usedHint = true; G.hint = r.path[0];
    const a = G.hint;
    toast((c.free ? 'Free daily hint: ' : 'Hint (−' + c.cost + '): ') + (a.k === 'move' ? 'move ' + a.d + '.' : a.k === 'favour' ? 'activate Favour now.' : 'hop to the glowing tile.'));
    if (a.k === 'favour') anim($('#btnFavour'), [{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 400, iterations: 3 });
    SFX.coin(); render();
  }

  /* ---------- stuck detection (exhaustive search via the engine) ---------- */
  function checkStuck() {
    const tok = ++checkToken, snap = G.S;
    $('#stuck').hidden = true; board.classList.remove('stuck-fx');
    if (snap.status !== 'play') return;
    setTimeout(() => {
      if (tok !== checkToken || !G || G.S !== snap) return;
      const r = AM.canWin(G.L, snap, { cap: 150000, ms: 200 });
      if (tok === checkToken && G.S === snap && r.result === 'stuck') {
        $('#stuck').hidden = false; board.classList.add('stuck-fx'); SFX.lose();
        addLog([{ text: 'This position can no longer be won.' }]); renderPanel();
      }
    }, 30);
  }

  /* ================= effects ================= */
  function tileRect(x, y) { const el = tileEls[y] && tileEls[y][x]; return el ? el.getBoundingClientRect() : null; }
  function fxBlocked(dir) {
    SFX.blocked(); buzz(35);
    anim(board, [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 220 });
    const p = actorEls.get('player'), d = AM.DELTA[dir];
    if (p) anim(p.firstChild, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + d[0] * 22 + '%,' + d[1] * 22 + '%) scale(.9,1.1)' }, { transform: 'translate(0,0)' }], { duration: 200 });
    const S = G.S; markX(S.player.x + d[0], S.player.y + d[1]);
  }
  function markX(x, y) {
    if (reduced()) return;
    const el = document.createElement('div');
    el.className = 'actor fx-x instant'; el.textContent = '✕';
    el.style.transform = 'translate(' + x * 100 + '%,' + y * 100 + '%)';
    actorsEl.appendChild(el);
    const a = anim(el, [{ opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1.2, offset: 0.3 }, { opacity: 0, scale: 1 }], { duration: 520 });
    if (a) a.onfinish = () => el.remove(); else el.remove();
  }
  function ripple(x, y, color) {
    if (reduced()) return;
    const el = document.createElement('div');
    el.className = 'actor instant';
    el.style.transform = 'translate(' + x * 100 + '%,' + y * 100 + '%)';
    el.innerHTML = '<div class="ripple" style="inset:14%;border-color:' + color + '"></div>';
    actorsEl.appendChild(el);
    const a = anim(el.firstChild, [{ opacity: 1, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(2)' }], { duration: 520 });
    if (a) a.onfinish = () => el.remove(); else el.remove();
  }
  function floatText(x, y, text, color) {
    const r = tileRect(x, y); if (!r || reduced()) return;
    const el = document.createElement('div');
    el.className = 'fx-text'; el.textContent = text; el.style.color = color;
    el.style.left = r.left + r.width / 2 - 20 + 'px'; el.style.top = r.top + 'px';
    $('#fx').appendChild(el);
    const a = anim(el, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-44px)', opacity: 0 }], { duration: 900 });
    if (a) a.onfinish = () => el.remove(); else el.remove();
  }
  function flyCoin(x, y, target) {
    const r = tileRect(x, y), t = target.getBoundingClientRect(); if (!r || reduced()) return;
    const el = document.createElement('div'); el.className = 'fx-coin';
    el.style.left = r.left + r.width / 2 - 12 + 'px'; el.style.top = r.top + r.height / 2 - 12 + 'px';
    $('#fx').appendChild(el);
    const dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
    const a = anim(el, [{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + dx * 0.4 + 'px,' + (dy * 0.4 - 60) + 'px) scale(1.2)', offset: 0.45 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.6)', opacity: 0.9 }], { duration: 650, easing: 'ease-in' });
    if (a) a.onfinish = () => { el.remove(); anim(target, [{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 220 }); }; else el.remove();
  }
  function fx(prev, next, events, meta) {
    const fired = new Set(events.filter((e) => e.echo).map((e) => e.echo));
    if (meta.kind === 'move') {
      const p = actorEls.get('player');
      if (p) anim(p.querySelector('.orb'), [{ transform: 'scale(1.2,.82)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      if (!fired.size) {
        const maxC = Math.max(0, ...next.echoes.map((e) => e.counter));
        if (next.echoes.length) SFX.tape(maxC - 1); else SFX.move();
      }
    }
    for (const e of events) {
      if (e.type === 'ECHO_MOVED') { const ec = next.echoes.find((q) => q.id === e.echo); ripple(ec.x, ec.y, ECHO_INFO[ec.type].color); SFX.fire(); buzz(15); }
      if (e.type === 'ECHO_BLOCKED') {
        SFX.echoBlocked();
        const el = actorEls.get('echo' + e.echo);
        if (el) anim(el.querySelector('.shape'), [{ translate: '0 0' }, { translate: '-5px 0' }, { translate: '5px 0' }, { translate: '0 0' }], { duration: 220 });
      }
      if (e.type === 'BUILD') { SFX.build(); const b = next.blocks[next.blocks.length - 1]; const el = actorEls.get('temp' + b.x + ',' + b.y); if (el) anim(el.firstChild, [{ transform: 'translateY(-60%) scale(1.1)' }, { transform: 'translateY(0) scale(1)' }], { duration: 260, easing: 'cubic-bezier(.3,1.6,.5,1)' }); }
      if (e.type === 'HELPER') SFX.tape(4);
      if (e.type === 'PUSH') SFX.push();
      if (e.type === 'LUCK') { SFX.coin(); flyCoin(next.player.x, next.player.y, $('#btnFavour').hidden ? $('#coinPill') : $('#btnFavour')); floatText(next.player.x, next.player.y, e.text.match(/\+\d+/)[0] + ' luck', '#ffc24b'); }
      if (e.type === 'ENEMY') {
        if (/targeting/.test(e.text)) SFX.alarm();
        if (/places/.test(e.text)) { SFX.slam(); buzz(40); const b = next.blocks[next.blocks.length - 1]; const el = actorEls.get('corr' + b.x + ',' + b.y); if (el) anim(el.firstChild, [{ transform: 'translateY(-90%)', opacity: 0 }, { transform: 'translateY(6%) scale(1.1,.9)', opacity: 1, offset: 0.7 }, { transform: 'none' }], { duration: 320 }); anim(board, [{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 180 }); }
      }
      if (e.type === 'FAVOUR' && meta.kind === 'move') SFX.echoBlocked();
    }
    for (const id of fired) {
      const card = $('#echoCards .ecard[data-id="' + id + '"]');
      if (card) card.querySelectorAll('.slot').forEach((s) => { s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); });
    }
    for (const l of Object.keys(next.open)) if (next.open[l] !== prev.open[l]) SFX.door(next.open[l]);
    if (next.status === 'won') {
      SFX.win(); buzz([20, 40, 60]);
      const ex = G.L.exit; ripple(ex.x, ex.y, '#6dffb3'); setTimeout(() => ripple(ex.x, ex.y, '#4fe3ff'), 150);
    }
  }

  /* ================= modals ================= */
  function openModal(html, onOpen) {
    $('#modal').innerHTML = html; $('#overlay').hidden = false;
    if (onOpen) onOpen();
    const f = $('#modal').querySelector('.gold') || $('#modal').querySelector('button');
    if (f) f.focus();
  }
  function closeModal() { $('#overlay').hidden = true; $('#modal').innerHTML = ''; $$('.confetti').forEach((c) => c.remove()); }
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = () => { SFX.click(); fn(); }; };

  function victory() {
    if (!G || G.S.status !== 'won') return;
    const L = G.L, S = G.S, collected = G.startCoins - S.coins.length;
    const receipt = P.applyClear(prog, L, { moves: S.moves, collected, usedHint: G.usedHint }, Date.now());
    persist();
    const last = G.idx === LEVELS.length - 1;
    openModal(
      '<div class="rays"></div><div class="kicker">WORLD 1 · LEVEL ' + L.id + ' · ' + esc(L.name).toUpperCase() + '</div>' +
      '<h2 class="win-title">' + (last ? 'WORLD CLEAR!' : 'LEVEL CLEAR!') + '</h2>' +
      '<div class="big-stars">' + [1, 2, 3].map((k) => '<svg class="' + (k <= receipt.stars ? 'lit' : '') + '" style="animation-delay:' + (0.2 + k * 0.18) + 's"><use href="#i-star"/></svg>').join('') + '</div>' +
      '<div class="stats-row"><span>Moves <b>' + S.moves + '</b>' + (L.par ? ' / par ' + L.par : '') + '</span><span>Best <b>' + receipt.best + '</b>' + (receipt.newBest && !receipt.first ? ' · new best!' : '') + '</span></div>' +
      '<div class="receipt">' + receipt.lines.map((r, i) => '<div class="r ' + r.tone + '" style="animation-delay:' + (0.5 + i * 0.12) + 's"><span>' + esc(r.label) + '</span><span>+' + r.value + '</span></div>').join('') +
      '<hr><div class="total"><span class="disp" style="font-size:22px">Total</span><b><i class="coin-ico"></i><span id="countUp">+0</span></b></div></div>' +
      '<div class="note"><svg><use href="#i-restart"/></svg><span>' + esc(receipt.next) + '</span></div>' +
      (last ? '<p>You finished every level in World 1. More worlds are on the way.</p>' : '') +
      '<div class="row"><button class="btn" id="vMap"><svg><use href="#i-map"/></svg>Map</button><button class="btn" id="vReplay"><svg><use href="#i-restart"/></svg>Replay</button>' +
      (last ? '' : '<button class="btn gold big" id="vNext">Next level<svg><use href="#i-play"/></svg></button>') + '</div>',
      () => {
        on('vMap', () => { mapSel = Math.min(G.idx + 1, LEVELS.length - 1); show('map'); });
        on('vReplay', () => startLevel(G.idx));
        on('vNext', () => startLevel(G.idx + 1));
        [1, 2, 3].forEach((k) => { if (k <= receipt.stars) setTimeout(() => SFX.star(k), (reduced() ? 0 : 350 + k * 180)); });
        countUp($('#countUp'), receipt.total);
        confetti();
      });
  }
  function countUp(el, total) {
    if (reduced() || total === 0) { el.textContent = '+' + total; coins(); return; }
    const t0 = performance.now() + 700, dur = 700;
    const tick = (t) => {
      const k = Math.max(0, Math.min(1, (t - t0) / dur));
      el.textContent = '+' + Math.round(total * k);
      if (k < 1) requestAnimationFrame(tick); else { coins(); anim($('#coinPill'), [{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 240 }); }
    };
    requestAnimationFrame(tick);
  }
  function confetti() {
    if (reduced()) return;
    const colors = ['#ffc24b', '#4fe3ff', '#ff5c8a', '#6dffb3', '#c49bff'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'confetti'; c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % 5];
      document.body.appendChild(c);
      const a = c.animate([{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(' + (window.innerHeight + 60) + 'px) rotate(' + (360 + Math.random() * 720) + 'deg)' }], { duration: 2200 + Math.random() * 1800, delay: Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)' });
      a.onfinish = () => c.remove();
    }
  }
  function failed() {
    SFX.lose(); buzz([60, 40, 60]);
    openModal('<div class="kicker">LEVEL ' + G.L.id + '</div><h2 class="lose-title">OUT OF MOVES</h2><p>' + esc(G.S.reason) + ' Undo a few moves or try a new line.</p>' +
      '<div class="row"><button class="btn" id="fMap"><svg><use href="#i-map"/></svg>Map</button><button class="btn" id="fUndo"><svg><use href="#i-undo"/></svg>Undo</button><button class="btn gold big" id="fRetry"><svg><use href="#i-restart"/></svg>Retry</button></div>',
      () => { on('fMap', () => show('map')); on('fUndo', () => { closeModal(); undo(); }); on('fRetry', restart); });
  }
  function pause() {
    openModal('<h2>Paused</h2><p>' + esc(G.def.name) + ' · ' + G.S.moves + ' moves so far</p>' +
      '<div class="row"><button class="btn gold big" id="pResume"><svg><use href="#i-play"/></svg>Resume</button></div>' +
      '<div class="row"><button class="btn" id="pRestart"><svg><use href="#i-restart"/></svg>Restart</button><button class="btn" id="pMap"><svg><use href="#i-map"/></svg>Level map</button><button class="btn" id="pHelp"><svg><use href="#i-help"/></svg>How to play</button><button class="btn" id="pSound"><svg><use href="#i-sound"/></svg>Sound ' + (prog.sound ? 'on' : 'off') + '</button></div>',
      () => { on('pResume', closeModal); on('pRestart', restart); on('pMap', () => show('map')); on('pHelp', help); on('pSound', () => { prog.sound = !prog.sound; persist(); applySettings(); pause(); }); });
  }
  function help() {
    const back = screen === 'game' ? '<button class="btn gold big" id="hOk">Back to the level</button>' : '<button class="btn gold big" id="hOk">Got it</button>';
    openModal('<h2>How to play</h2>' +
      '<p>Reach the portal. Every move you make is recorded, and each <b style="color:var(--gold)">echo</b> groups your moves into batches. When a batch is full, the echo copies <b>only its first move</b>. The rest are thrown away.</p>' +
      '<div class="help-demo card"><div class="ecard-top"><div class="glyph trace" style="--g:40px"><span>T</span></div><div><b style="color:var(--gold)">Trace · batch of 4</b><small>You move ↑ → ↓ ←. Trace takes one step ↑.</small></div></div>' +
      '<div class="tape"><div class="slot filled head">' + ARROW('UP') + '</div><div class="slot filled">' + ARROW('RIGHT') + '</div><div class="slot filled">' + ARROW('DOWN') + '</div><div class="slot filled">' + ARROW('LEFT') + '</div></div></div>' +
      '<ul class="help-list"><li>Moves into walls are not recorded. A blocked echo still uses up its batch, so walls let it wait.</li>' +
      '<li>Plates hold doors open while something stands on them. Crates can be pushed but never pulled.</li>' +
      '<li><b>Escape together</b>: required echoes must also reach the portal.</li>' +
      '<li>Coins fill Luck. At 100, Favour makes echoes act every 2 moves for a while.</li>' +
      '<li>Stuck? The game checks every possible line and tells you when a level can no longer be won.</li></ul>' +
      '<p class="keys"><kbd>←↑↓→</kbd>/<kbd>WASD</kbd> or swipe · <kbd>Z</kbd> undo · <kbd>R</kbd> restart · <kbd>F</kbd> favour · <kbd>H</kbd> hop · <kbd>O</kbd> oracle · <kbd>Esc</kbd> pause</p>' +
      '<div class="row">' + back + '</div>', () => on('hOk', () => { prog.introDone = true; persist(); closeModal(); }));
  }
  function settings(confirmReset) {
    openModal('<h2>Settings</h2>' +
      '<div class="setting">Sound effects<button class="toggle" role="switch" id="sSound" aria-checked="' + !!prog.sound + '" aria-label="Sound effects"></button></div>' +
      '<div class="setting">Reduce motion<button class="toggle" role="switch" id="sMotion" aria-checked="' + !!prog.reduceMotion + '" aria-label="Reduce motion"></button></div>' +
      '<div class="setting">Progress<button class="btn" id="sReset" style="min-height:42px' + (confirmReset ? ';background:var(--pink);color:#2a0010' : '') + '">' + (confirmReset ? 'Tap again to erase' : 'Reset progress') + '</button></div>' +
      '<div class="row"><button class="btn gold big" id="sOk">Done</button></div>', () => {
      on('sSound', () => { prog.sound = !prog.sound; persist(); applySettings(); settings(); });
      on('sMotion', () => { prog.reduceMotion = !prog.reduceMotion; persist(); applySettings(); settings(); });
      on('sReset', () => { if (!confirmReset) return settings(true); prog = P.defaults(); prog.introDone = true; persist(); applySettings(); mapSel = null; closeModal(); show('title'); toast('Progress erased.'); });
      on('sOk', () => { closeModal(); if (screen === 'title') renderTitle(); });
    });
  }
  function toast(msg) {
    $$('.toast').forEach((t) => t.remove());
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ================= input ================= */
  const KEYS = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT' };
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (!$('#overlay').hidden) {
      if (k === 'Escape') { closeModal(); if (screen === 'game' && G && G.S.status !== 'play') { /* stay on result */ } }
      else if ((k === 'n' || k === 'Enter') && $('#vNext')) { ev.preventDefault(); startLevel(G.idx + 1); }
      else if (k === 'r' && G && G.S.status === 'lost') restart();
      return;
    }
    if (screen !== 'game') {
      if (k === 'Escape' && screen !== 'title') show('title');
      return;
    }
    if (KEYS[k]) { ev.preventDefault(); move(KEYS[k]); }
    else if (k === 'z' || k === 'u' || k === 'Backspace') { ev.preventDefault(); undo(); }
    else if (k === 'r') restart();
    else if (k === 'f') favour();
    else if (k === 'h') toggleHop();
    else if (k === 'o') toggleOracle();
    else if (k === 'Escape') { if (G.hop) { G.hop = false; render(); } else if (!$('#tip').hidden) $('#tip').hidden = true; else pause(); }
  });
  // swipe + hop taps on the board
  let swipe = null;
  board.addEventListener('pointerdown', (e) => { swipe = { x: e.clientX, y: e.clientY }; });
  board.addEventListener('pointerup', (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) { move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP')); return; }
    if (G && G.hop) { const t = e.target.closest('.tile'); if (t) tryHop(+t.dataset.x, +t.dataset.y); }
  });
  $$('.dpad button').forEach((b) => b.addEventListener('click', () => move(b.dataset.dir)));
  $('#btnUndo').onclick = undo; $('#btnRestart').onclick = restart; $('#btnFavour').onclick = favour;
  $('#btnHop').onclick = toggleHop; $('#btnOracle').onclick = toggleOracle; $('#btnHint').onclick = hint;
  $('#btnPause').onclick = () => { SFX.click(); pause(); };
  $('#stuckUndo').onclick = undo; $('#stuckRestart').onclick = restart;
  $('#tContinue').onclick = () => { SFX.click(); startLevel(P.nextLevelIndex(prog, LEVELS)); };
  $$('[data-go]').forEach((b) => (b.onclick = () => { SFX.click(); if (b.dataset.go === 'map') mapSel = null; show(b.dataset.go); }));
  $$('[data-open]').forEach((b) => (b.onclick = () => { SFX.click(); b.dataset.open === 'help' ? help() : settings(); }));
  $('#overlay').addEventListener('click', (e) => { if (e.target === $('#overlay') && G && G.S.status === 'play' && screen === 'game') closeModal(); });
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (screen === 'game') { fit(); render(true); } }, 80); });

  // boot
  applySettings();
  show('title');
  if (!prog.introDone) help();
  // test hook for automated play-throughs
  window.__am = { state: () => G && G.S, level: () => G && G.L, start: startLevel, show };
})();
