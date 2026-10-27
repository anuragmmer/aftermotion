/* Aftermotion app: screens, DOM board renderer, effects and input.
 * Rules live in engine.js, rewards in progress.js; this file only presents state and sends commands. */
(function () {
  'use strict';
  const AM = window.AM, LEVELS = window.AMLevels, P = window.AMProgress, SFX = window.AMAudio, Shop = window.AMShop, Chars = window.AMChars, Amb = window.AMAmbient, Cos = window.AMCosmetics, R = window.AMRewards;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const ROT = { UP: 0, RIGHT: 90, DOWN: 180, LEFT: 270 };
  const ARROW = (dir, cls) => '<svg class="' + (cls || '') + '" style="transform:rotate(' + ROT[dir] + 'deg)"><use href="#i-arrow"/></svg>';
  const STAR = '<svg><use href="#i-star"/></svg>';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);

  const ECHO_INFO = {
    trace: { name: 'Echo', glyph: 'E', color: '#ffc24b', b: 4, sel: 'First move', verb: 'Walk', role: 'The basic echo. Copies the first move of every 4.', tips: ['Plan the first move of each group of 4; the other three are free.', 'Its trace (the dotted line and dashed square) shows exactly where it will step next.', 'A blocked step still uses up the group, so walls let Echo wait.'] },
    flicker: { name: 'Flicker', glyph: 'F', color: '#c49bff', b: 2, sel: 'First move', verb: 'Walk + Hop', role: 'A fast echo. Copies the first move of every 2, and can hop.', tips: ['Twice as responsive as Echo, so it drifts quickly.', 'Press H and tap a glowing tile: Flicker hops there (even over walls), holds it for 4 moves, then returns.'] },
    mason: { name: 'Mason', glyph: 'M', color: '#ff9a5e', b: 4, sel: 'First move', verb: 'Build', role: 'A builder echo. Builds a block where the group\'s first move points.', tips: ['Mason never walks. Aim the first move of a batch at the tile you want built.', 'A block on a plate holds its door until the block expires.'] },
    keeper: { name: 'Keeper', glyph: 'K', color: '#6dffb3', b: 3, sel: 'Any', verb: 'Send helper', role: 'A helper echo. Every 3 moves, sends a helper to the nearest free plate.', tips: ['Helpers walk on their own and hold a plate for 6 moves.', 'If a helper cannot arrive in time, it fades away.'] },
    blocker: { name: 'Blocker', glyph: '!', color: '#ff5c8a', b: 0, sel: '—', verb: 'Corrupt', role: 'Hostile. Telegraphs a tile, then drops a corruption block on it.', tips: ['The red reticle shows where and when it strikes.', 'Corruption fades after 6 moves.'], hostile: true },
  };
  const firstLevelWith = (key) => {
    const ch = { trace: 'T', flicker: 'F', mason: 'M', keeper: 'K', blocker: 'Z' }[key];
    const l = LEVELS.find((d) => d.map.some((r) => r.includes(ch)));
    return l ? l.id : null;
  };

  let prog = R.init(P.load());
  let screen = 'title', G = null, mapSel = null, echoSel = 'trace';
  const board = $('#board'), frame = $('#frame');
  let tileEls = [], actorsEl = null, actorEls = new Map(), checkToken = 0;

  const reduced = () => prog.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anim = (el, frames, opts) => { if (!el || reduced() || !el.animate) return null; return el.animate(frames, Object.assign({ duration: 200, easing: 'ease-out' }, opts)); };
  const buzz = (ms) => { try { if (!reduced() && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* unsupported */ } };
  function persist() { P.save(prog); }
  function coins() { $$('.coinCount').forEach((el) => (el.textContent = prog.coins.toLocaleString('en-US'))); cloverUI(); }
  /* Clover: the lasting Luck meter. Echo steps and coins fill it, bumping echoes into walls drains it. */
  function cloverUI() {
    const full = R.luckFull(prog);
    $$('.cloverCount').forEach((el) => (el.textContent = prog.luck));
    $('#cloverFill').style.width = prog.luck + '%';
    $('#cloverMeter').classList.toggle('full', full); $('#tClover').classList.toggle('full', full);
  }
  function cloverInfo() {
    openModal('<div class="kicker">LASTING LUCK</div><h2><svg class="h-ico" style="color:var(--mint)"><use href="#i-clover"/></svg> Clover ' + prog.luck + ' / 100</h2>' +
      '<div class="bar2 big"><i style="width:' + prog.luck + '%"></i></div>' +
      '<p>Clover is luck you keep between levels. It grows when you treat your echoes well, and fills the same way in every level.</p>' +
      '<ul class="help-list"><li><b style="color:var(--mint)">+' + R.LUCK.step + '</b> every time an echo takes a step</li><li><b style="color:var(--mint)">+' + R.LUCK.coin + '</b> for each coin you collect in a level</li>' +
      '<li><b style="color:var(--mint)">+' + R.LUCK.gentle + '</b> for clearing a level with no echo bumps</li><li><b style="color:var(--pink)">' + R.LUCK.bump + '</b> each time an echo walks into a wall, door or block</li>' +
      '<li>Undo takes back what the undone move gave or cost.</li></ul>' +
      '<p><b>When Clover is full</b> a banner appears on the board: tap it (or Favour) in <b>any level with echoes</b> for a free Favour. Echoes act twice as often for ' + AM.CONFIG.favourDuration + ' moves.</p>' +
      '<div class="row"><button class="btn gold big" id="clOk">Got it</button></div>', () => on('clOk', closeModal));
  }
  function applySettings() {
    SFX.setEnabled(!!prog.sound); document.body.classList.toggle('reduce', !!prog.reduceMotion);
    Shop.SLOTS.forEach((k) => (document.body.dataset[k] = prog.equip[k]));
    applyAura();
  }
  /* The equipped legendary item's aura sets the mood of the whole game. */
  let auraPreview = null;
  function applyAura() {
    if (auraPreview) return;
    Amb.setMode(prog.ambient !== false && !reduced() ? Shop.activeAura(prog) : null);
  }
  const TRAILS = {
    glow: {}, fizz: { color: '#7fdcff', burst: 'bubbles' }, hearts: { color: '#ff8fb1', burst: 'hearts' }, pixels: { color: '#6dffb3', burst: 'pixels' },
    sparks: { color: '#ffffff', burst: 'sparks' }, frosttrail: { color: '#bfe9ff', burst: 'snow' }, petals: { color: '#ffb3d1', burst: 'petals' },
    embers: { color: '#ff7a3d', burst: 'embers' }, rainbow: { color: 'hue', burst: 'confetti' }, comet: { color: '#ffe066', burst: 'comet' },
    shadow: { color: '#6e64a8', burst: 'smoke' }, lightning: { color: '#7fd6ff', bolt: true, burst: 'sparks' }, starfall: { color: '#fff3c4', burst: 'stars' },
    inferno: { color: '#ff5a2e', burst: 'flames' }, matrixtrail: { color: '#39ff8a', burst: 'code' },
  };
  const AURA_BURST = { inferno: 'embers', frost: 'snow', cosmos: 'stars', matrix: 'code', aurora: 'sparks', sakura: 'petals', synth: 'neon', gold: 'comet', void: 'implode' };
  /* Cosmetic markup: hand-made items use their own class; generated ones (cosmetics.js) use a
     style class plus palette variables. */
  const genOf = (id) => { const it = Shop.byId(id); return it && it.gen ? it.gen : null; };
  const orbHTML = (id) => { const g = genOf(id); return g ? '<div class="orb og og-' + g.style + '" style="' + Cos.vars(g) + '"></div>' : '<div class="orb o-' + id + '"></div>'; };
  const dotHTML = (id, tag, extra) => { tag = tag || 'div'; const g = genOf(id); return g ? '<' + tag + ' class="dot tg tg-' + g.style + '" style="' + Cos.vars(g) + (extra || '') + '"></' + tag + '>' : '<' + tag + ' class="dot t-' + id + '"' + (extra ? ' style="' + extra + '"' : '') + '></' + tag + '>'; };
  function portalClass(el, id) {
    const g = genOf(id);
    if (!g) return ' p-' + id;
    el.style.setProperty('--c1', g.c1); el.style.setProperty('--c2', g.c2); el.style.setProperty('--c3', g.c3);
    return ' pg pg-' + g.style;
  }
  const trailOf = (id) => { const it = Shop.byId(id); return it && it.gen ? { color: it.gen.c1, burst: it.burst, burstColor: it.gen.c1 } : TRAILS[id] || {}; };
  const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  /* ================= screens ================= */
  function setTheme(theme, boss) {
    document.body.dataset.theme = theme || '';
    document.body.classList.toggle('boss', !!boss);
    if (!boss) ['danger', 'favoured', 'hopmode', 'won'].forEach((c) => document.body.classList.remove(c));
  }
  function show(name) {
    screen = name;
    if (name === 'title' || name === 'echoes' || name === 'rewards') setTheme('');
    if (name === 'map') setTheme('w' + (mapWorld || LEVELS[P.nextLevelIndex(prog, LEVELS)].world));
    $$('.screen').forEach((s) => (s.hidden = s.id !== name));
    closeModal();
    coins();
    if (name === 'title') renderTitle();
    if (name === 'map') renderMap();
    if (name === 'echoes') renderEchoes();
    if (name === 'shop') renderShop();
    if (name === 'rewards') renderRewards();
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
    const day = today(), ds = P.dailyStatus(prog, day), di = P.dailyLevelIndex(prog, LEVELS, day);
    const dc = $('#tDaily');
    dc.classList.toggle('ready', di >= 0 && !ds.done); dc.classList.toggle('done', ds.done);
    $('#tDailySub').textContent = di < 0 ? 'Clear level 1 to unlock' : ds.done ? 'Done for today. Back tomorrow!' : 'Today: ' + LEVELS[di].name + ' · reach par for ×2';
    $('#tStreak').innerHTML = ds.streak ? '<svg style="color:var(--gold)"><use href="#i-flame"/></svg>' + ds.streak : '';
    R.ensureQuests(prog, day);
    const spins = R.spinsAvailable(prog, day), chests = prog.chestQueue.length, claim = R.claimableCount(prog, LEVELS, day), n = spins + chests + claim;
    const qDone = prog.quests.list.filter((q) => q.claimed).length;
    $('#tRewards').classList.toggle('ready', n > 0);
    $('#tRewardsBadge').hidden = !n; $('#tRewardsBadge').textContent = n;
    $('#tRewardsSub').textContent = n ? [chests ? plural(chests, 'chest') : '', spins ? plural(spins, 'spin') : '', claim ? claim + ' to claim' : ''].filter(Boolean).join(' · ')
      : 'Quests ' + qDone + '/3 · free spin in ' + untilTomorrow();
    $('#tFoot').textContent = WORLDS.length + ' worlds · ' + LEVELS.length + ' levels';
    const goal = Shop.nextGoal(prog, LEVELS);
    $('#tShopSub').textContent = goal ? 'Next: ' + goal.text : 'Everything unlocked!';
    $('#tShopNew').hidden = !(goal && goal.ready);
  }
  function playDaily() {
    const day = today(), di = P.dailyLevelIndex(prog, LEVELS, day), ds = P.dailyStatus(prog, day);
    if (di < 0) { toast('Clear level 1 first: the Daily Echo picks from levels you have beaten.'); return; }
    if (ds.done) { toast('You already played today\'s Daily Echo. Streak: ' + ds.streak + '. Come back tomorrow!'); return; }
    SFX.click(); startLevel(di, { daily: true });
  }
  /* Time left until the daily reset (quests, free spin, Daily Echo all roll over at 00:00 UTC). */
  function untilTomorrow() {
    const now = new Date(), t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime();
    const h = Math.floor(t / 3600000), m = Math.floor((t % 3600000) / 60000);
    return h ? h + 'h ' + m + 'm' : m + 'm';
  }

  /* ---------- map ---------- */
  const WORLDS = LEVELS.WORLDS;
  let mapWorld = null;
  const levelsOf = (w) => LEVELS.map((l, i) => ({ l, i })).filter((o) => o.l.world === w);
  function mapPoints(n) {
    const xs = [130, 375, 625, 870], pts = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 4), col = i % 4, c = row % 2 ? 3 - col : col;
      pts.push({ x: xs[c], y: 95 + row * 210 + Math.sin(i * 1.7) * 14 });
    }
    return pts;
  }
  function levelChips(def) {
    const s = def.map.join(''), out = [];
    if (s.includes('T')) out.push('Echo'); if (s.includes('F')) out.push('Flicker'); if (s.includes('M')) out.push('Mason'); if (s.includes('K')) out.push('Keeper');
    if (/[a-d]/.test(s)) out.push('Plate + door'); if (s.includes('o')) out.push('Crate'); if (s.includes('c')) out.push('Coins'); if (s.includes('Z')) out.push('Blocker');
    if (def.exitLock) out.push('Powered portal');
    if (def.id % 10 === 0) out.push('Boss level'); else if (def.id % 5 === 0) out.push('Reactive floor');
    if (def.maxMoves) out.push(def.maxMoves + ' move limit');
    out.push(def.mode === 'together' ? 'Escape together' : 'Escape through');
    return out;
  }
  const cleared = (l) => !!(prog.levels[l.id] && prog.levels[l.id].clears);
  function renderMap() {
    const cur = P.nextLevelIndex(prog, LEVELS);
    if (mapSel === null) mapSel = cur;
    if (mapWorld === null) mapWorld = LEVELS[mapSel].world;
    const W = WORLDS[mapWorld - 1], items = levelsOf(mapWorld);
    if (LEVELS[mapSel].world !== mapWorld) mapSel = (items.find((o) => P.isUnlocked(prog, LEVELS, o.i) && !cleared(o.l)) || items[0]).i;
    $('#mapKicker').textContent = 'WORLD ' + W.id + ' OF ' + WORLDS.length + ' · LEVELS ' + items[0].l.id + '–' + items[items.length - 1].l.id;
    $('#mapName').textContent = W.name;
    $('#mapBlurb').textContent = W.blurb + ' ' + items.filter((o) => cleared(o.l)).length + ' / ' + items.length + ' cleared.';
    setTheme('w' + mapWorld);
    $('#mapPrev').disabled = mapWorld === 1; $('#mapNext').disabled = mapWorld === WORLDS.length;
    const pts = mapPoints(items.length + 1);
    const toPct = (p) => ({ left: p.x / 10 + '%', top: (p.y / 620) * 100 + '%' });
    const d = (arr) => arr.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y.toFixed(0)).join(' ');
    $('#mapPathAll').setAttribute('d', d(pts));
    const doneCount = items.filter((o) => cleared(o.l)).length;
    $('#mapPathDone').setAttribute('d', doneCount ? d(pts.slice(0, Math.min(doneCount, items.length - 1) + 1)) : '');
    let html = '';
    items.forEach(({ l, i }, k) => {
      const rec = prog.levels[l.id], unlocked = P.isUnlocked(prog, LEVELS, i), p = toPct(pts[k]);
      const cls = 'node' + (!unlocked ? ' locked' : i === cur && !cleared(l) ? ' cur' : '') + (i === mapSel ? ' sel' : '');
      const stars = rec && rec.clears ? '<span class="nstars">' + [1, 2, 3].map((q) => '<svg style="fill:' + (q <= rec.stars ? 'var(--gold)' : 'transparent') + '"><use href="#i-star"/></svg>').join('') + '</span>' : '';
      html += '<button class="' + cls + '" data-i="' + i + '" style="left:' + p.left + ';top:' + p.top + '" aria-label="Level ' + l.id + (unlocked ? '' : ' (locked)') + '">' +
        (unlocked ? l.id : '<svg><use href="#i-lock"/></svg>') + stars + '</button>';
    });
    const fp = toPct(pts[items.length]), nextW = WORLDS[mapWorld];
    html += nextW
      ? '<button class="node future" id="mapNextWorld" style="left:' + fp.left + ';top:' + fp.top + '"><svg><use href="' + (P.isUnlocked(prog, LEVELS, levelsOf(nextW.id)[0].i) ? '#i-play' : '#i-lock') + '"/></svg>' + esc(nextW.name) + '</button>'
      : '<div class="node future" style="left:' + fp.left + ';top:' + fp.top + '"><svg><use href="#i-lock"/></svg>More soon</div>';
    if (LEVELS[cur].world === mapWorld) {
      const ap = toPct(pts[items.findIndex((o) => o.i === cur)]);
      html += '<div class="avatar" style="left:' + ap.left + ';top:' + ap.top + '"></div>';
    }
    $('#mapNodes').innerHTML = html;
    $$('#mapNodes .node[data-i]').forEach((b) => (b.onclick = () => {
      const i = +b.dataset.i;
      if (!P.isUnlocked(prog, LEVELS, i)) { toast('Clear level ' + LEVELS[i - 1].id + ' to unlock this one.'); SFX.echoBlocked(); return; }
      SFX.click();
      if (mapSel === i) startLevel(i); else { mapSel = i; renderMap(); }
    }));
    const nw = $('#mapNextWorld'); if (nw) nw.onclick = () => switchWorld(1);
    renderMapInfo();
  }
  function switchWorld(dir) {
    const w = mapWorld + dir; if (w < 1 || w > WORLDS.length) return;
    SFX.click(); mapWorld = w; mapSel = -1;
    const items = levelsOf(w); mapSel = (items.find((o) => P.isUnlocked(prog, LEVELS, o.i) && !cleared(o.l)) || items[0]).i;
    renderMap();
  }
  function renderMapInfo() {
    const i = mapSel, l = LEVELS[i], rec = prog.levels[l.id], unlocked = P.isUnlocked(prog, LEVELS, i);
    const base = P.baseReward(l), coinsIn = l.map.join('').split('').filter((c) => c === 'c' || c === '*').length;
    const maxFirst = Math.round(base * 1.5) + Math.round(base * 1.5 * 0.1) + coinsIn * P.RULES.coinValue;
    $('#mapInfo').innerHTML =
      '<h3>Level ' + l.id + '</h3><div class="lvl-name">' + esc(l.name) + '</div>' +
      '<div class="lesson-badge"><svg><use href="#i-bulb"/></svg><span>' + esc(l.lesson) + '</span></div>' +
      '<div class="stars-row">' + [1, 2, 3].map((k) => '<svg style="fill:' + (rec && k <= rec.stars ? 'var(--gold)' : 'transparent') + '"><use href="#i-star"/></svg>').join('') + '</div>' +
      '<div class="chips">' + levelChips(l).map((c) => '<span class="chip">' + esc(c) + '</span>').join('') + '</div>' +
      '<p class="dim small" style="margin:0">' + esc(l.intro) + '</p>' +
      '<div class="small">Par <b>' + (l.par || '—') + '</b>' + (rec && rec.best !== null ? ' · Best <b>' + rec.best + '</b>' : '') + '</div>' +
      '<div class="small dim">' + (rec && rec.clears ? esc(P.nextReplayInfo(P.record(prog, l.id), Date.now())) : 'First clear pays up to ' + maxFirst + ' coins.') + '</div>' +
      (unlocked ? '' : '<p class="small lock-why"><svg><use href="#i-lock"/></svg>Clear level ' + LEVELS[i - 1].id + ' (or skip it with a Skip ticket from the Shop) to unlock this level.</p>') +
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
    const daily = !!(opts && opts.daily) || !!(opts && opts.restart && G && G.daily);
    G = { daily, react: def.id % 5 === 0, idx: i, def, L: r.level, S: r.state, undo: [], log: [], hop: false, oracle: G ? G.oracle : false, usedHint: false, hint: null, trail: [], startCoins: r.state.coins.length, movesUsed: false, luckUsed: false, bumps: 0, steps: 0, favours: 0, undos: 0 };
    r.state.echoes.forEach((e) => (prog.seen[e.type] = true));
    if (r.state.enemy) prog.seen.blocker = true;
    persist();
    show('game');
    $('#gWorld').textContent = daily ? 'DAILY ECHO · ' + today() : 'WORLD ' + def.world + ' · ' + WORLDS[def.world - 1].name.toUpperCase() + ' · LEVEL ' + def.id;
    $('#gName').innerHTML = esc(def.name) + '<span class="boss-tag">BOSS</span><span class="daily-tag">DAILY</span>';
    setTheme(daily ? 'daily' : 'w' + def.world, !daily && def.id % 10 === 0);
    buildBoard(); buildCards(); fit(true);
    const fresh = !cleared(def) && !(opts && opts.restart) && !daily;
    G.tut = TUTORIALS[def.id] && !cleared(def) ? { steps: TUTORIALS[def.id], i: 0 } : null;
    G.coach = { h: '<span class="lesson-inline">Lesson: ' + esc(def.lesson) + '</span> ' + esc(def.intro), c: '' };
    G.log = [{ h: opts && opts.restart ? 'Level restarted.' : 'Level started.', c: '' }];
    render(true);
    if (fresh) lessonCard();
  }
  function lessonCard() {
    const d = G.def;
    openModal('<div class="kicker">WORLD ' + d.world + ' · LEVEL ' + d.id + '</div><h2>' + esc(d.name) + '</h2>' +
      '<div class="lesson-badge big"><svg><use href="#i-bulb"/></svg><span>' + esc(d.lesson) + '</span></div>' +
      '<p class="lesson-text">' + esc(d.intro) + '</p><p class="plan" id="lcPlanText" hidden>' + esc(d.plan) + '</p>' +
      '<div class="row"><button class="btn" id="lcPlan">Show plan</button><button class="btn gold big" id="lcGo"><svg><use href="#i-play"/></svg>Start</button></div>', () => {
      on('lcPlan', () => { const p = $('#lcPlanText'); p.hidden = !p.hidden; $('#lcPlan').textContent = p.hidden ? 'Show plan' : 'Hide plan'; });
      on('lcGo', () => { closeModal(); renderPanel(); });
    });
  }
  function planSheet() {
    const d = G.def;
    openModal('<div class="kicker">LEVEL ' + d.id + ' · PLAN</div><h2>' + esc(d.name) + '</h2><div class="lesson-badge"><svg><use href="#i-bulb"/></svg><span>' + esc(d.lesson) + '</span></div>' +
      '<p class="plan">' + esc(d.plan) + '</p><div class="row"><button class="btn gold big" id="psOk">Back to the level</button></div>', () => on('psOk', closeModal));
  }

  /* ---------- tutorials: scripted, hands-on first steps ---------- */
  const TUTORIALS = {
    1: [
      { say: 'Welcome! Move with the arrow keys or WASD, or swipe on the board. Try a move now.', expect: 'any' },
      { say: 'Every level ends at the spinning portal. Follow the corridor to reach it.', end: true },
    ],
    2: [
      { say: 'This gold ring is <b>Echo</b>, your first echo. It repeats some of your moves, but not all of them.', spot: 'echo:1', ack: true },
      { say: 'Every move you make goes onto Echo\'s tape (the 4 slots in the panel). Slot 1 is the one that counts.', spot: 'tape:1', ack: true },
      { say: 'Press ' + arrHtml('RIGHT') + ' (right) once.', expect: 'RIGHT', spot: 'tape:1' },
      { say: 'Your ' + arrHtml('RIGHT') + ' landed in slot 1, marked <b>COPIED</b>. The dotted line and dashed square on the board are its <b>trace</b>: the step it will take when the tape is full.', spot: 'pred:1', ack: true },
      { say: 'Now make any 3 moves. They fill slots 2 to 4, and Echo ignores them. Watch it on your 4th move.', expect: 'fire', spot: 'tape:1' },
      { say: 'Echo stepped ' + arrHtml('RIGHT') + ', along its trace, because that was the first of your 4 moves. The tape is empty again, so your next move is the new slot 1.', spot: 'echo:1', ack: true },
      { say: 'Echo needs one more step right to reach the portal. Start the next group with ' + arrHtml('RIGHT') + ', then walk onto the portal yourself.', end: true },
    ],
    3: [
      { say: 'Plates and doors come in matching colours. Plate <b>a</b> opens door <b>A</b>, but only while something stands on the plate.', spot: 'plate:A', ack: true },
      { say: 'You cannot stand on the plate and walk through the door at the same time, so Echo has to hold the plate. Tap Plan if you get stuck.', spot: 'door:A', end: true },
    ],
    4: [
      { say: 'This is a crate. Walk into it to push it. You can never pull it back, so think before you push.', spot: 'crate', ack: true },
      { say: 'A crate on a plate holds its door open, just like an echo would.', spot: 'plate:A', end: true },
    ],
    5: [{ say: 'Coins fill your Luck meter: the ring on the Favour button. At 100, press Favour and your echoes act twice as often for a while.', spot: 'btn:Favour', end: true }],
    6: [{ say: 'This green hexagon is <b>Keeper</b>. It never walks: every 3 moves it sends a helper to the nearest free plate.', spot: 'echo:1', end: true }],
    7: [{ say: 'This orange square is <b>Mason</b>. When a group completes, it builds a block next to itself in the direction of the group\'s first move.', spot: 'echo:1', end: true }],
    8: [{ say: 'The pink diamond is the <b>Blocker</b>. It marks a tile in red, counts down, then drops a block there.', spot: 'enemy', end: true }],
    9: [{ say: 'The violet triangle is <b>Flicker</b>: it uses groups of 2, and it can hop. Press H (or Hop), then tap a green tile.', spot: 'btn:Hop', end: true }],
    31: [{ say: 'Flicker is back. Groups of 2 mean your 1st, 3rd, 5th… moves all reach it. Watch its tape: only 2 slots.', spot: 'tape:1', end: true }],
    41: [{ say: 'Mason never walks. A group starting with ' + arrHtml('DOWN') + ' makes it build on the plate below it.', spot: 'echo:1', end: true }],
  };
  function arrHtml(d) { return '<span class="arr h">' + ({ UP: '↑', RIGHT: '→', DOWN: '↓', LEFT: '←' })[d] + '</span>'; }
  const tutStep = () => (G && G.tut ? G.tut.steps[G.tut.i] : null);
  function tutAdvance(events, meta) {
    const st = tutStep(); if (!st) return;
    if (st.end) { G.tut = null; return; }
    if (!st.expect) return;
    const ok = st.expect === 'any' ? meta.kind === 'move'
      : st.expect === 'fire' ? events.some((e) => e.type === 'ECHO_MOVED' || e.type === 'ECHO_BLOCKED')
      : meta.dir === st.expect;
    if (ok) nextTut();
  }
  function nextTut() { if (!G.tut) return; G.tut.i++; if (G.tut.i >= G.tut.steps.length) G.tut = null; SFX.click(); renderPanel(); flashCoach(); }
  function spotEls(sp) {
    if (!sp) return [];
    const [k, v] = sp.split(':'), L = G.L;
    if (k === 'echo' || k === 'pred') return [actorEls.get(k + v)];
    if (k === 'tape') return [$('#echoCards .ecard[data-id="' + v + '"] .tape')];
    if (k === 'plate' || k === 'door') {
      const src = k === 'plate' ? L.plates : L.doors;
      return Object.keys(src).filter((q) => src[q] === v).map((q) => { const [x, y] = q.split(',').map(Number); return tileEls[y][x]; });
    }
    if (k === 'crate') return [...actorEls.keys()].filter((q) => q.startsWith('push')).map((q) => actorEls.get(q));
    if (k === 'enemy') return [actorEls.get('enemy')];
    if (k === 'btn') return [$('#btn' + v)];
    return [];
  }

  const PLATE_COLOR = { A: '#4fe3ff', B: '#ff9a5e', C: '#c49bff', D: '#6dffb3' };
  function buildBoard() {
    const L = G.L;
    board.innerHTML = ''; tileEls = []; actorEls = new Map();
    const ring = L.tiles[0].split('').every((c) => c === '#') && L.tiles[L.h - 1].split('').every((c) => c === '#') && L.tiles.every((r) => r[0] === '#' && r[L.w - 1] === '#');
    G.ox = ring ? 1 : 0;
    board.style.setProperty('--w', L.w - 2 * G.ox);
    board.classList.remove('stuck-fx'); $('#stuck').hidden = true;
    for (let y = 0; y < L.h; y++) {
      const row = [];
      for (let x = 0; x < L.w; x++) {
        if (G.ox && (x === 0 || y === 0 || x === L.w - 1 || y === L.h - 1)) { row.push(null); continue; }
        const el = document.createElement('div'), k = AM.key(x, y);
        el.dataset.x = x; el.dataset.y = y;
        let cls = 'tile ' + (L.tiles[y][x] === '#' ? 'wall' : 'floor' + ((x + y) % 2 ? ' alt' : ''));
        let lbl = '';
        if (L.plates[k]) { cls += ' plate'; lbl = L.plates[k].toLowerCase(); el.style.setProperty('--pc', PLATE_COLOR[L.plates[k]]); }
        if (L.doors[k]) { cls = 'tile floor door'; lbl = L.doors[k]; el.style.setProperty('--pc', PLATE_COLOR[L.doors[k]]); }
        if (AM.isExit(L, x, y)) { cls += ' exit' + portalClass(el, prog.equip.portal); lbl = lbl || ''; if (L.exitLock.length) { cls += ' powered'; lbl = L.exitLock[0].toLowerCase(); el.style.setProperty('--pc', PLATE_COLOR[L.exitLock[0]]); } }
        el.className = cls;
        if (lbl) el.innerHTML = '<span class="lbl">' + lbl + '</span>';
        if (AM.isExit(L, x, y)) el.insertAdjacentHTML('beforeend', '<span class="peye"></span>');
        board.appendChild(el); row.push(el);
      }
      tileEls.push(row);
    }
    actorsEl = document.createElement('div'); actorsEl.className = 'actors'; board.appendChild(actorsEl);
  }

  /* Tile size depends on width only on phones (the browser bar changes the height while you
     scroll), so the board never jumps around mid-level. */
  let fitKey = '';
  function fit(force) {
    if (!G) return false;
    const L = G.L, narrow = window.innerWidth <= 980;
    const cols = L.w - 2 * G.ox, rows = L.h - 2 * G.ox;
    const availW = $('#stage').clientWidth - (narrow ? 10 : 20);
    const screenH = Math.max(window.screen && window.screen.height ? window.screen.height : 0, 480);
    const availH = narrow ? Math.round(screenH * 0.56) : window.innerHeight - 170;
    const key = L.id + ':' + availW + ':' + availH;
    if (!force && key === fitKey) return false;
    fitKey = key;
    const ts = Math.max(26, Math.floor(Math.min(availW / cols, availH / rows, narrow ? 72 : 96)));
    board.style.setProperty('--ts', ts + 'px');
    return true;
  }

  /* ---------- keyed actor sync ---------- */
  const tr = (x, y) => 'translate(' + (x - G.ox) * 100 + '%,' + (y - G.ox) * 100 + '%)';
  function actor(key, cls, html, x, y, seen) {
    seen.add(key);
    let el = actorEls.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'actor instant ' + cls; el.innerHTML = html;
      actorsEl.appendChild(el); actorEls.set(key, el);
      el.style.transform = tr(x, y);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('instant')));
      anim(el, [{ opacity: 0, transform: el.style.transform + ' scale(.4)' }, { opacity: 1, transform: el.style.transform }], { duration: 220, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      el._new = true;
    } else {
      el._new = false;
      el.className = 'actor ' + cls + (el.classList.contains('instant') ? ' instant' : '');
      el.style.transform = tr(x, y);
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
      if (!el) continue;
      if (L.plates[k]) el.classList.toggle('on', !!S.plateActive[L.plates[k]]);
      if (L.doors[k]) el.classList.toggle('open', !!S.open[L.doors[k]]);
      if (AM.isExit(L, x, y)) {
        el.classList.toggle('locked', !ready);
        const dx = S.player.x - x, dy = S.player.y - y, len = Math.hypot(dx, dy) || 1;
        el.style.setProperty('--ex', (dx / len) * 4 + 'px'); el.style.setProperty('--ey', (dy / len) * 4 + 'px');
      }
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
    G.trail.forEach((p, i) => { const el = actor('trail' + i, 'trail', dotHTML(prog.equip.trail), p.x, p.y, seen); el.style.opacity = 0.32 - i * 0.1; el.firstChild.style.transform = 'scale(' + (1 - i * 0.22) + ')'; });
    for (const e of S.echoes) {
      if (e.hopping && e.hop.origin) actor('ghost' + e.id, 'echo ghost-origin ' + e.type + (charOf() ? ' char' : ''), echoBody(e, true), e.hop.origin.x, e.hop.origin.y, seen);
      const el = actor('echo' + e.id, 'echo ' + e.type + (charOf() ? ' char' : '') + (e.required ? ' required' : '') + (e.state === 'FAVOURED' ? ' fav' : '') + (e.state === 'COOLDOWN' ? ' cool' : ''),
        echoBody(e) + '<div class="pips"></div><svg class="head"><use href="#i-arrow"/></svg>', e.x, e.y, seen);
      el.style.setProperty('--c', ECHO_INFO[e.type].color);
      const size = e.counter === 0 ? AM.batchSize(e) : e.activeB;
      const pips = el.querySelector('.pips');
      if (pips.childElementCount !== size) pips.innerHTML = '<i></i>'.repeat(size);
      Array.from(pips.children).forEach((p, i) => p.classList.toggle('on', i < e.counter));
      const head = el.querySelector('.head');
      head.style.display = e.batch.length && e.type !== 'keeper' ? '' : 'none';
      const look = e.batch.length ? AM.DELTA[e.batch[0]] : [0, 0];
      el.style.setProperty('--px', look[0] * 4.5 + 'px'); el.style.setProperty('--py', look[1] * 4 + 'px');
      if (e.batch.length) head.style.transform = 'rotate(' + ROT[e.batch[0]] + 'deg)';
    }
    for (const e of S.echoes) {
      if (e.hopping || !e.batch.length || !(walker(e) || e.type === 'mason')) continue;
      const d = AM.DELTA[e.batch[0]], tx = e.x + d[0], ty = e.y + d[1];
      if (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) continue;
      const blocked = walker(e) ? !!obstacle(L, S, tx, ty) : !!AM.placementError(L, S, tx, ty);
      const el = actor('pred' + e.id, 'pred' + (blocked ? ' blk' : ''), '<s class="tl"></s><div class="po"></div><i></i><b></b>', tx, ty, seen);
      el.style.setProperty('--c', ECHO_INFO[e.type].color);
      el.querySelector('.tl').style.transform = 'rotate(' + { RIGHT: 180, LEFT: 0, DOWN: 270, UP: 90 }[e.batch[0]] + 'deg)';
      el.querySelector('b').textContent = e.activeB - e.counter;
      el.querySelector('i').textContent = blocked ? '✕' : '';
    }
    actor('player', 'playerA', '<div class="orb-bob">' + orbHTML(prog.equip.orb) + '</div>', S.player.x, S.player.y, seen);
    // hint marker
    if (G.hint) {
      const a = G.hint;
      if (a.k === 'move') {
        const d = AM.DELTA[a.d];
        const el = actor('hint', 'hintGhost', '<div class="hring"><i></i></div><div class="hg">' + orbHTML(prog.equip.orb) + '</div>', S.player.x, S.player.y, seen);
        el.style.setProperty('--hx', d[0]); el.style.setProperty('--hy', d[1]);
      } else if (a.k === 'hop') actor('hint', 'hintGhost', '<div class="hring" style="transform:none"><i></i></div>', a.x, a.y, seen);
    }
    sweep(seen);
    renderPanel();
  }

  // Full Clover can pay for Favour whenever some echo can accept it and the level's Luck cannot.
  const cloverReady = () => G && G.S.status === 'play' && R.luckFull(prog) && !AM.favourReady(G.S) && AM.favourReady(Object.assign({}, G.S, { luck: AM.CONFIG.favourCost }));
  function hopper() { return G.S.echoes.find((e) => e.hop && !e.hopping && e.hop.charges > 0 && e.state !== 'COOLDOWN'); }

  /* ---------- side panel ---------- */
  function buildCards() {
    $('#echoCards').innerHTML = G.S.echoes.map((e) => {
      const info = ECHO_INFO[e.type];
      return '<div class="ecard" data-id="' + e.id + '" style="--c:' + info.color + '"><div class="ecard-top">' + cardGlyph(e) +
        '<div><b>' + nm(e) + '</b><small>' + esc(info.role) + '</small></div>' + (e.required ? '<span class="etag">REQUIRED</span>' : '') + '</div>' +
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
        slot.classList.toggle('next', !d && i === 0 && e.batch.length === 0 && e.type !== 'keeper');
        if (d && slot.dataset.d !== d) { slot.innerHTML = ARROW(d); slot.dataset.d = d; }
        if (!d && slot.dataset.d) { slot.innerHTML = ''; delete slot.dataset.d; }
      });
      card.querySelector('.estatus').innerHTML = cardStatus(e);
    }
    // mood
    const B = document.body.classList;
    B.toggle('danger', S.status === 'play' && !!L.maxMoves && L.maxMoves - S.moves <= 3);
    B.toggle('favoured', S.echoes.some((e) => e.state === 'FAVOURED'));
    B.toggle('hopmode', !!G.hop);
    B.toggle('won', S.status === 'won');
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
    req.forEach((e) => g.push({ done: !e.hopping && AM.isExit(L, e.x, e.y), text: 'Bring ' + nm(e) + ' to the portal' }));
    g.push({ done: S.status === 'won', text: req.length ? 'Reach the portal together' : 'Reach the portal' });
    if (L.maxMoves) g.push({ done: false, text: 'Finish within ' + L.maxMoves + ' moves (' + (L.maxMoves - S.moves) + ' left)' });
    const total = G.startCoins, got = total - S.coins.length;
    if (total) g.push({ done: got === total, text: 'Coins ' + got + ' / ' + total + ' (optional)' });
    $('#goals').innerHTML = g.map((q) => '<div class="goal' + (q.done ? ' done' : '') + '"><i>' + (q.done ? '✓' : '') + '</i>' + esc(q.text) + '</div>').join('');
    // buttons
    const hasLuck = G.startCoins > 0 || L.luck0 > 0, cr = cloverReady();
    $('#btnFavour').hidden = !S.echoes.length || !(hasLuck || cr);
    $('#btnFavour').style.setProperty('--p', cr ? 100 : S.luck);
    $('#btnFavour').classList.toggle('ready', AM.favourReady(S) || cr);
    $('#btnFavour').classList.toggle('clover', cr);
    $('#btnFavour').title = cr ? 'Favour (F) · paid by your full Clover' : 'Favour (F) · Luck ' + S.luck + '/100';
    $('#cloverBanner').hidden = !cr;
    $('#btnHop').hidden = !S.echoes.some((e) => e.hop);
    $('#btnHop').classList.toggle('on', G.hop);
    $('#btnHop').disabled = !hopper() && !G.hop;
    $('#btnUndo').disabled = !G.undo.length;
    $('#btnOracle').classList.toggle('on', G.oracle);
    $('#btnOracle').setAttribute('aria-pressed', G.oracle);
    const price = P.hintPrice(prog, today());
    $('#hintLabel').textContent = !price ? 'Hint · free' : prog.inv.hint ? 'Hint · ' + prog.inv.hint + ' left' : 'Hint · ' + price;
    // hint highlights the matching control
    $$('.dpad button').forEach((b) => b.classList.toggle('hinted', !!G.hint && G.hint.k === 'move' && b.dataset.dir === G.hint.d));
    $('#btnFavour').classList.toggle('hinted', !!G.hint && G.hint.k === 'favour');
    $('#btnHop').classList.toggle('hinted', !!G.hint && G.hint.k === 'hop');
    // boosts
    const coinsHere = G.startCoins > 0 || L.luck0 > 0;
    $('#btnMoves').hidden = !L.maxMoves || !prog.inv.moves || G.movesUsed || S.status === 'won';
    $('#movesLabel').textContent = '+3 moves ×' + prog.inv.moves;
    $('#btnLuck').hidden = !coinsHere || !prog.inv.luck || G.luckUsed || S.luck >= 100 || S.status !== 'play';
    $('#luckLabel').textContent = 'Lucky charm ×' + prog.inv.luck;
    $('#btnSkip').hidden = !prog.inv.skip || cleared(G.def) || G.daily || G.idx === LEVELS.length - 1;
    $('#skipLabel').textContent = 'Skip ×' + prog.inv.skip;
    // oracle
    $('#oracleCard').hidden = !G.oracle || S.status !== 'play';
    if (G.oracle && S.status === 'play') {
      $('#oracleList').innerHTML = AM.oracle(L, S).map((o) => {
        if (!o.accepted) return '<div class="no">' + ARROW(o.dir) + '<span>Blocked</span></div>';
        return '<div class="' + (o.status === 'won' ? 'win' : '') + '">' + ARROW(o.dir) + '<span>' + esc(o.notes.length ? o.notes.join(' ') : 'Nothing else happens.') + '</span></div>';
      }).join('');
    }
    // feed
    $('#feed').innerHTML = G.log.slice(0, 6).map((l) => '<li class="' + l.c + '">' + l.h + '</li>').join('');
    // coach
    const st = tutStep();
    $$('.spot').forEach((el) => el.classList.remove('spot'));
    $('#coach').classList.toggle('tut', !!st);
    if (st) {
      $('#coachTag').textContent = 'TUTORIAL ' + (G.tut.i + 1) + ' / ' + G.tut.steps.length;
      $('#coachWhat').innerHTML = st.say; $('#coachWhat').className = '';
      $('#coachNext').innerHTML = st.ack ? '<div><button class="btn gold" id="tutNext">Next</button></div>'
        : st.end ? nextLines(S).map((l) => '<div class="ln" style="--c:' + (l.color || 'var(--cyan)') + '"><span>' + l.h + '</span></div>').join('')
        : '<div class="ln"><span>' + (st.expect === 'RIGHT' ? 'Waiting for ' + arrHtml('RIGHT') : st.expect === 'fire' ? 'Keep moving: Echo follows its trace when the tape is full.' : 'Make any move.') + '</span></div>';
      const nb = $('#tutNext'); if (nb) nb.onclick = nextTut;
      spotEls(st.spot).forEach((el) => el && el.classList.add('spot'));
    } else {
      $('#coachTag').textContent = 'COACH';
      $('#coachWhat').innerHTML = G.coach.h; $('#coachWhat').className = G.coach.c;
      $('#coachNext').innerHTML = nextLines(S).map((l) => '<div class="ln" style="--c:' + (l.color || 'var(--cyan)') + '"><span>' + l.h + '</span></div>').join('');
    }
  }
  /* ---------- coach: plain-language explanations of what happened and what comes next ---------- */
  const AR = { UP: '↑', RIGHT: '→', DOWN: '↓', LEFT: '←' };
  const WORD = { UP: 'up', RIGHT: 'right', DOWN: 'down', LEFT: 'left' };
  const arr = (d, head) => '<span class="arr' + (head ? ' h' : '') + '">' + AR[d] + '</span>';
  const seq = (b) => b.map((d, i) => arr(d, i === 0)).join(' ');
  // Echoes of the same kind are numbered ("Echo 1", "Echo 2") so twins can be told apart.
  const dupNo = (e) => { const same = G.S.echoes.filter((q) => q.type === e.type); return same.length > 1 ? same.findIndex((q) => q.id === e.id) + 1 : 0; };
  const nm = (e) => ECHO_INFO[e.type].name + (dupNo(e) ? ' ' + dupNo(e) : '');
  // Echo faces: 'letter' shows the echo's letter; any other face hides it and draws eyes + mouth.
  const faceHTML = (id) => (id === 'letter' ? '' : '<i class="face f-' + id + '"><b></b><b></b><u></u></i>');
  const letterHTML = (t, id, n) => '<em class="g' + (id === 'letter' ? '' : ' hide') + '">' + ECHO_INFO[t].glyph + (n && id === 'letter' ? '<sub>' + n + '</sub>' : '') + '</em>';
  const charOf = () => (prog.equip.face !== 'letter' && Chars.ROSTER.find((c) => c.id === prog.equip.face)) || null;
  const kindBadge = (e) => ECHO_INFO[e.type].glyph + (dupNo(e) ? dupNo(e) : '');
  // Board markup for one echo: the equipped character standing on a platform in its kind's colour,
  // with a letter badge, or the classic kind shape when no character is equipped.
  function echoBody(e, ghost) {
    const ch = charOf();
    if (!ch) return '<div class="shape"><span>' + glyphOf(e) + '</span></div>';
    return '<div class="plat"></div><div class="charbox">' + Chars.render(ch) + '</div>' + (ghost ? '' : '<b class="kb">' + kindBadge(e) + '</b>');
  }
  function cardGlyph(e) {
    const ch = charOf();
    return ch ? '<div class="glyph charglyph" style="--c:' + ECHO_INFO[e.type].color + '">' + Chars.render(ch) + '</div>'
      : '<div class="glyph ' + e.type + '"><span>' + glyphOf(e) + '</span></div>';
  }
  /* Character moods: happy when it steps, dizzy when it bumps, asleep when you stop playing. */
  function mood(id, m, ms) {
    const el = actorEls.get('echo' + id), box = el && el.querySelector('.charbox');
    if (!box) return;
    ['happy', 'dizzy', 'sleep'].forEach((k) => box.classList.remove('mood-' + k));
    void box.offsetWidth;
    box.classList.add('mood-' + m);
    clearTimeout(box._t);
    if (ms) box._t = setTimeout(() => box.classList.remove('mood-' + m), ms);
  }
  let lastInput = Date.now();
  function wake() {
    lastInput = Date.now();
    $$('.charbox.mood-sleep').forEach((b) => b.classList.remove('mood-sleep'));
  }
  setInterval(() => {
    if (screen !== 'game' || !G || G.S.status !== 'play' || Date.now() - lastInput < 9000) return;
    G.S.echoes.forEach((e) => { const box = actorEls.get('echo' + e.id) && actorEls.get('echo' + e.id).querySelector('.charbox'); if (box && !box.classList.contains('mood-sleep')) mood(e.id, 'sleep', 0); });
  }, 1000);
  const glyphOf = (e) => letterHTML(e.type, prog.equip.face, dupNo(e)) + faceHTML(prog.equip.face) + (dupNo(e) && prog.equip.face !== 'letter' ? '<sup class="num">' + dupNo(e) + '</sup>' : '');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const walker = (e) => e.type === 'trace' || e.type === 'flicker';
  function obstacle(L, S, x, y) {
    if (AM.isWall(L, x, y)) return 'a wall';
    const d = AM.doorLetter(L, x, y); if (d && !S.open[d]) return 'closed door ' + d;
    const b = AM.blockAt(S, x, y);
    if (b) return b.kind === 'push' ? 'a crate' : b.kind === 'temp' ? 'a built block' : 'a corruption block';
    return null;
  }
  function blockedText(dir, events) {
    const why = ((events[0] && events[0].text.match(/\((.*)\)/)) || [])[1] || '';
    const r = why === 'wall' ? 'a wall is in the way'
      : why === 'closed door' ? 'the door is closed (something has to stand on its plate to open it)'
      : /pushed/.test(why) ? 'the crate cannot be pushed there, because something is behind it'
      : 'a block is in the way';
    return 'You cannot move ' + WORD[dir] + ': ' + r + '. Blocked moves do not count, so your echoes did not see it.';
  }
  function explain(prev, next, events, meta) {
    const out = [], add = (h, c, pri) => out.push({ h, c: c || '', p: pri || 3 });
    if (meta.kind === 'favour' && meta.clover) add('Clover Favour! Your full Clover paid for it. From their next group, echoes use groups of 2 instead of 4, so they act twice as often.', 'gold', 1);
    else if (meta.kind === 'favour') add('Favour is on! From their next group, echoes use groups of 2 instead of 4, so they act twice as often.', 'gold', 1);
    for (const ev of events) {
      const e = ev.echo ? next.echoes.find((q) => q.id === ev.echo) : null;
      const pe = ev.echo ? prev.echoes.find((q) => q.id === ev.echo) : null;
      const batch = pe && meta.dir ? pe.batch.concat([meta.dir]) : [], hd = batch[0];
      switch (ev.type) {
        case 'ECHO_MOVED':
          add(nm(e) + ' stepped ' + arr(hd, true) + '. Your last ' + batch.length + ' moves were ' + seq(batch) + ', and ' + nm(e) + ' only copies the first one.', 'gold', 1); break;
        case 'ECHO_BLOCKED':
          if (walker(e)) {
            const r = { wall: 'a wall', 'closed door': 'a closed door', block: 'a block' }[(ev.text.match(/blocked by (.*)\./) || [])[1]] || 'something';
            add(nm(e) + ' tried to step ' + arr(hd, true) + ' (the first of ' + seq(batch) + '), but ' + r + ' is in the way, so it stayed put. The group is used up anyway, and the bump cost ' + (-R.LUCK.bump) + ' Clover.', 'bad', 1);
          } else if (e.type === 'mason') {
            add(/no charges/.test(ev.text) ? 'Mason has no blocks left to build.' : 'Mason could not build ' + arr(hd, true) + ': ' + esc((ev.text.match(/\((.*)\)/) || [])[1] || 'that tile is taken') + '. No block was used.', 'bad', 1);
          } else if (e.type === 'keeper') {
            add(/already/.test(ev.text) ? 'Keeper skipped this turn: its helper is still out.' : 'Keeper has no helpers left.', '', 1);
          }
          break;
        case 'BUILD': add('Mason built a block ' + arr(hd, true) + ' of itself, because ' + arr(hd, true) + ' was the first of your moves ' + seq(batch) + '. It lasts ' + AM.CONFIG.tempBlockTtl + ' moves.', 'gold', 1); break;
        case 'NO_TARGET': add('Keeper found no free plate it can reach, so it did nothing this time.', 'bad', 1); break;
        case 'HELPER':
          if (/sends/.test(ev.text)) add('Keeper sent a helper to the nearest free plate. The helper walks there on its own and holds the plate for ' + AM.CONFIG.helperHold + ' moves.', 'gold', 1);
          else if (/reached/.test(ev.text)) add('The helper is standing on the plate, so its door is open for ' + AM.CONFIG.helperHold + ' moves. Go!', 'good', 1);
          else if (/missed|lost/.test(ev.text)) add('The helper could not reach the plate in time and disappeared.', 'bad', 1);
          else add('The helper finished and disappeared. The plate is free again.', '', 2);
          break;
        case 'LUCK': add('Coin! Luck is now ' + next.luck + '/100.' + (next.luck >= 100 ? ' Luck is full: press Favour (F) to make echoes act twice as often.' : ' At 100 you can use Favour.'), 'good', 2); break;
        case 'ENEMY':
          if (/targeting/.test(ev.text)) add('The Blocker marked the red square. In ' + AM.CONFIG.enemyTelegraph + ' moves it drops a block there that lasts ' + AM.CONFIG.corruptionTtl + ' moves.', 'bad', 1);
          else if (/places/.test(ev.text)) add('The Blocker dropped its block. It fades after ' + AM.CONFIG.corruptionTtl + ' moves.', 'bad', 1);
          else add('Something was standing on the Blocker\'s target, so it gave up this time.', '', 2);
          break;
        case 'EXPIRE': add(/temporary/.test(ev.text) ? 'Mason\'s block faded away.' : 'The corruption block faded away.', '', 2); break;
        case 'FAVOUR':
          if (!e) break; // activation itself is described via meta.kind
          if (/ends/.test(ev.text)) add(nm(e) + '\'s Favour ran out. It is slower for ' + AM.CONFIG.cooldown + ' moves while it cools down.', '', 2);
          else add(nm(e) + ' is back to its normal speed.', '', 2);
          break;
        case 'HOP':
          if (/hops to/.test(ev.text)) add(nm(e) + ' hopped. It stays there for ' + AM.CONFIG.hopHold + ' moves (holding the plate if it landed on one), then jumps back.', 'good', 1);
          else if (/returns/.test(ev.text)) add(nm(e) + ' jumped back to where it hopped from.', '', 2);
          else add(nm(e) + ' could not jump back because something is in the way, so it stays here.', 'bad', 2);
          break;
        case 'PUSH': add('You pushed the crate.', '', 8); break;
        case 'WIN': add('Level complete!', 'good', 0); break;
        case 'LOSE': add('Out of moves.', 'bad', 0); break;
      }
    }
    for (const l of Object.keys(next.open)) {
      if (next.open[l] === prev.open[l]) continue;
      if (next.open[l]) add('Door ' + l + ' opened, because something is standing on plate ' + l.toLowerCase() + '.', 'good', 2);
      else add('Door ' + l + ' closed: nothing is on plate ' + l.toLowerCase() + ' any more.', 'bad', 2);
    }
    if (meta.kind === 'move' && !out.some((q) => q.p <= 2)) {
      const e = next.echoes.find((q) => !q.hopping && (walker(q) || q.type === 'mason'));
      if (e && e.counter === 1 && e.activeB > 1) add(arr(meta.dir, true) + ' is the first move of ' + nm(e) + '\'s new group, so ' + nm(e) + (e.type === 'mason' ? ' will build in that direction' : ' will step that way') + ' once the group is full.', '', 4);
      else if (e && e.counter > 1) add('That move filled slot ' + e.counter + ' of ' + e.activeB + ' on ' + nm(e) + '\'s tape. Only slot 1 matters to ' + nm(e) + ', so this move just moved you.', '', 4);
      else if (!next.echoes.length) add('Nice. Keep heading for the portal.', '', 5);
    }
    out.sort((a, b) => a.p - b.p);
    return out;
  }
  function nextLines(S) {
    const L = G.L, out = [];
    if (S.status !== 'play') return out;
    for (const e of S.echoes) {
      const color = ECHO_INFO[e.type].color, n = nm(e);
      if (e.hopping) { out.push({ color, h: n + ' jumps back in ' + plural(e.hop.hold, 'move') + '.' }); continue; }
      const size = e.counter === 0 ? AM.batchSize(e) : e.activeB, left = size - e.counter;
      if (walker(e)) {
        if (e.counter === 0) out.push({ color, h: size === 1 ? n + ' copies every move right now.' : 'Your next move starts ' + n + '\'s new group: ' + n + ' will step that way after ' + plural(size, 'move') + ' (watch the tape).' });
        else {
          const hd = e.batch[0], d = AM.DELTA[hd], ob = obstacle(L, S, e.x + d[0], e.y + d[1]);
          out.push({ color, h: n + ' will step ' + arr(hd, true) + ' in ' + plural(left, 'move') + ' (its trace on the board).' + (ob ? ' Right now ' + ob + ' is there, so it would bump into it and stay put.' : '') + ' Your next ' + plural(left, 'move') + ' won\'t change that.' });
        }
      } else if (e.type === 'mason') {
        if (e.charges <= 0) out.push({ color, h: 'Mason has no blocks left.' });
        else if (e.counter === 0) out.push({ color, h: 'Your next move picks where Mason builds: it builds a block in that direction after ' + plural(size, 'move') + '.' });
        else out.push({ color, h: 'Mason will build a block ' + arr(e.batch[0], true) + ' of itself in ' + plural(left, 'move') + ' (its trace on the board).' });
      } else if (e.type === 'keeper') {
        const h = S.helpers.find((q) => q.owner === e.id);
        if (h) out.push({ color, h: h.state === 'PERFORM' ? 'The helper holds the plate for ' + plural(h.hold, 'more move') + '.' : 'The helper is walking to the plate. It has ' + plural(h.life, 'move') + ' to get there.' });
        else if (e.charges <= 0) out.push({ color, h: 'Keeper has no helpers left.' });
        else out.push({ color, h: 'Keeper sends a helper to the nearest free plate in ' + plural(left, 'move') + '. It does not matter which way you move.' });
      }
    }
    const en = S.enemy;
    if (en && en.state === 'TELEGRAPH') out.push({ color: '#ff5c8a', h: 'Red square: the Blocker drops a block there in ' + plural(en.t, 'move') + '.' });
    if (AM.favourReady(S)) out.push({ color: '#ffc24b', h: 'Luck is full. Press Favour (F) to make echoes act twice as often.' });
    if (hopper()) out.push({ color: '#c49bff', h: 'Flicker\'s hop is ready: press H (or the Hop button), then tap a green tile.' });
    if (!S.echoes.length) {
      [...new Set(Object.values(L.doors))].forEach((l) => { if (!S.open[l]) out.push({ h: 'Door ' + l + ' is closed. Put something on plate ' + l.toLowerCase() + ' to open it; crates count.' }); });
      if (!out.length) out.push({ h: 'Head for the spinning portal.' });
    }
    if (L.maxMoves && L.maxMoves - S.moves <= 3) out.push({ color: '#ff5c8a', h: 'Only ' + plural(L.maxMoves - S.moves, 'move') + ' left!' });
    return out;
  }
  function cardStatus(e) {
    if (e.hopping) return '<span class="HOPPING">HOPPING</span> · back in ' + e.hop.hold;
    const size = e.counter === 0 ? AM.batchSize(e) : e.activeB, left = size - e.counter;
    let t = e.state === 'FAVOURED' ? '<span class="FAVOURED">FAVOUR · ' + e.favour + ' left</span> · ' : e.state === 'COOLDOWN' ? '<span class="COOLDOWN">COOLING DOWN · ' + e.cooldown + '</span> · ' : '';
    if (e.type === 'keeper') t += 'helper in ' + plural(left, 'move') + ' · ' + e.charges + ' left';
    else if (e.counter === 0) t += 'next move = slot 1 (the one that counts)';
    else t += (e.type === 'mason' ? 'builds ' : 'steps ') + AR[e.batch[0]] + ' in ' + plural(left, 'move');
    if (e.type === 'mason') t += ' · ' + e.charges + ' blocks';
    if (e.hop) t += ' · hop ' + (e.hop.charges ? 'ready' : 'used');
    return t;
  }
  function say(lines) {
    if (!lines.length) return;
    G.coach = { h: lines[0].h, c: lines[0].c };
    for (let i = lines.length - 1; i >= 0; i--) G.log.unshift({ h: lines[i].h, c: lines[i].c });
    G.log = G.log.slice(0, 30);
  }
  function flashCoach() { const c = $('#coach'); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }

  /* ---------- commands ---------- */
  const busy = () => !$('#overlay').hidden || screen !== 'game' || !G;
  function move(dir) {
    if (busy() || G.S.status !== 'play') return;
    wake();
    const st = tutStep();
    if (st && st.ack) { toast('Tap Next in the coach panel to continue.'); flashCoach(); return; }
    if (st && /^(UP|RIGHT|DOWN|LEFT)$/.test(st.expect || '') && dir !== st.expect) { toast('For this step, press ' + ({ UP: '↑', RIGHT: '→', DOWN: '↓', LEFT: '←' })[st.expect] + '.'); flashCoach(); return; }
    if (G.hop) { G.hop = false; }
    const r = AM.step(G.L, G.S, dir);
    if (!r.accepted) { fxBlocked(dir); say([{ h: blockedText(dir, r.events), c: 'bad' }]); renderPanel(); flashCoach(); return; }
    G.trail = [{ x: G.S.player.x, y: G.S.player.y }].concat(G.trail).slice(0, 3);
    commit(r.state, r.events, { kind: 'move', dir });
  }
  function commit(next, events, meta) {
    wake();
    const prev = G.S;
    G.undo.push({ S: prev, trail: G.trail.slice(1), d: tally(events, meta) });
    if (G.undo.length > 400) G.undo.shift();
    G.S = next; G.hint = null;
    say(explain(prev, next, events, meta));
    tutAdvance(events, meta);
    render();
    fx(prev, next, events, meta);
    if (next.status === 'won') setTimeout(victory, reduced() ? 50 : 650);
    else if (next.status === 'lost') setTimeout(failed, 350);
    else checkStuck();
  }
  function undo() {
    if (busy() || !G.undo.length) return;
    const u = G.undo.pop(); G.S = u.S; G.trail = u.trail; G.hint = null; G.hop = false; untally(u.d); G.undos++;
    say([{ h: 'Rewound one move.', c: '' }]);
    SFX.undo(); render(); checkStuck();
  }
  /* Lasting effects of one command (Clover, stats); undo reverses exactly these, so luck cannot be
     farmed by moving and undoing. Quests count net totals when the level is cleared. */
  function tally(events, meta) {
    const st = prog.stats, d = { luck: 0, steps: 0, bumps: 0, moves: meta.kind === 'move' ? 1 : 0, fav: meta.kind === 'favour' ? 1 : 0 };
    d.steps = events.filter((e) => e.type === 'ECHO_MOVED').length;
    d.bumps = events.filter((e) => e.type === 'ECHO_BLOCKED' && /tries/.test(e.text)).length;
    d.luck = R.addLuck(prog, R.luckFromEvents(events)) - (meta.clover ? R.LUCK.cost : 0);
    if (d.fav && !meta.clover) st.favours++; // spendLuck already counted clover favours
    st.echoSteps += d.steps; st.echoBumps += d.bumps; st.moves += d.moves;
    G.steps += d.steps; G.bumps += d.bumps; G.favours += d.fav;
    persist();
    return d;
  }
  function untally(d) {
    if (!d) return;
    const st = prog.stats;
    prog.luck = Math.max(0, Math.min(R.LUCK.max, prog.luck - d.luck));
    st.echoSteps -= d.steps; st.echoBumps -= d.bumps; st.moves -= d.moves; st.favours -= d.fav;
    G.steps -= d.steps; G.bumps -= d.bumps; G.favours -= d.fav;
    persist();
  }
  function restart() { if (G) { SFX.undo(); startLevel(G.idx, { restart: true }); } }
  function favour() {
    if (busy()) return;
    let r = AM.activateFavour(G.L, G.S), clover = false;
    if (!r.ok && cloverReady()) {
      // the level's own Luck is not full, so full Clover pays for this Favour instead
      const S2 = AM.clone(G.S); S2.luck = AM.CONFIG.favourCost;
      r = AM.activateFavour(G.L, S2);
      if (r.ok) { r.state.luck = G.S.luck; clover = true; R.spendLuck(prog); }
    }
    if (!r.ok) {
      toast(G.S.luck < AM.CONFIG.favourCost ? 'Favour needs 100 Luck. Collect coins in this level, or fill your Clover (' + prog.luck + '/100) by letting echoes walk without bumping.' : r.events[0].text);
      SFX.echoBlocked(); return;
    }
    SFX.favour(); commit(r.state, r.events, { kind: 'favour', clover });
    if (clover) { const b = $('#btnFavour'); if (b && !b.hidden) { const [x, y] = center(b); Amb.burst('petals', x, y, 18, '#6dffb3'); } }
    anim(frame, [{ boxShadow: '0 0 0 3px #ffc24b, 0 0 60px #ffc24b' }, { boxShadow: '0 0 0 3px #2c2266, 0 18px 40px #00000080' }], { duration: 700 });
  }
  function toggleHop() {
    if (busy() || G.S.status !== 'play') return;
    if (G.hop) G.hop = false;
    else if (hopper()) { G.hop = true; toast('Tap a green tile. Flicker jumps there, stays ' + AM.CONFIG.hopHold + ' moves, then jumps back. Esc cancels.'); }
    else { toast(G.S.echoes.some((e) => e.hop && e.hop.charges === 0) ? 'Flicker has already used its one hop this level.' : 'Flicker cannot hop right now.'); return; }
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
    if (price && !prog.inv.hint && price > prog.coins) { toast('Hints cost ' + price + ' coins after the free daily one, or buy a Hint pack in the Shop.'); SFX.echoBlocked(); return; }
    const r = AM.canWin(G.L, G.S, { ms: 900, cap: 300000 });
    if (r.result === 'unknown') { toast('Too many possibilities to hint from here. Try a few moves first.'); return; }
    if (r.result === 'stuck') { toast('No solution from this position. Undo first.'); return; }
    const c = price && prog.inv.hint ? (Shop.useBoost(prog, 'hint'), { ok: true, token: true, cost: 0 }) : P.chargeHint(prog, today()); persist();
    G.usedHint = true; G.hint = r.path[0];
    const a = G.hint;
    say([{ h: (c.free ? 'Free daily hint: ' : c.token ? 'Hint (' + prog.inv.hint + ' left): ' : 'Hint (−' + c.cost + ' coins): ') +
      (a.k === 'move' ? 'move ' + arrHtml(a.d) + '. Follow your ghost onto the glowing tile.' : a.k === 'favour' ? 'press Favour now (the glowing button).' : 'hop Flicker onto the glowing tile (Hop button, then tap it).'), c: 'good' }]);
    SFX.coin(); render();
  }

  /* ---------- boosts ---------- */
  function boostMoves() {
    if (busy() || G.movesUsed || !G.L.maxMoves || !Shop.useBoost(prog, 'moves')) return;
    persist(); G.movesUsed = true;
    G.L = Object.assign({}, G.L, { maxMoves: G.L.maxMoves + 3 });
    if (G.S.status === 'lost') { G.S = Object.assign(AM.clone(G.S), { status: 'play', reason: '' }); closeModal(); }
    say([{ h: '+3 moves added. This run can earn at most 2 stars.', c: 'gold' }]);
    SFX.favour(); render(); checkStuck();
  }
  function boostLuck() {
    if (busy() || G.luckUsed || !Shop.useBoost(prog, 'luck')) return;
    persist(); G.luckUsed = true;
    G.S = AM.clone(G.S); G.S.luck = Math.min(100, G.S.luck + 40);
    say([{ h: 'Lucky charm: Luck is now ' + G.S.luck + '/100.' + (G.S.luck >= 100 ? ' Press Favour (F)!' : ''), c: 'gold' }]);
    SFX.coin(); render();
  }
  function boostSkip() {
    if (busy()) return;
    openModal('<h2>Skip this level?</h2><p>Uses 1 Skip ticket (' + prog.inv.skip + ' left). The next level unlocks now; come back any time to earn stars here.</p>' +
      '<div class="row"><button class="btn" id="skNo">Keep trying</button><button class="btn gold big" id="skYes"><svg><use href="#i-skip"/></svg>Skip</button></div>', () => {
      on('skNo', closeModal);
      on('skYes', () => { if (!Shop.useBoost(prog, 'skip')) return; P.skipLevel(prog, G.def); persist(); toast('Skipped. Level ' + LEVELS[G.idx + 1].id + ' unlocked.'); startLevel(G.idx + 1); });
    });
  }

  /* ---------- shop ---------- */
  let shopTab = 'face';
  const TAB_NAMES = { face: 'Characters', orb: 'Orbs', trail: 'Trails', portal: 'Portals', boost: 'Boosts' };
  function previewHTML(item) {
    if (item.slot === 'face' && item.char) return '<button class="preview charpv" data-pv="' + item.id + '" aria-label="Play with ' + esc(item.name) + '"><span class="charbox">' + Chars.render(item.char) + '</span><span class="plat" style="--c:' + Chars.RARITY[item.rarity].color + '"></span></button>';
    if (item.slot === 'face') return '<div class="preview">' + ['trace', 'flicker', 'mason'].map((t) => '<div class="glyph ' + t + '" style="--g:46px;--ts:46px"><span>' + letterHTML(t, item.id) + faceHTML(item.id) + '</span></div>').join('') + '</div>';
    if (item.slot === 'orb') return '<div class="preview"><div class="pv-actor">' + orbHTML(item.id) + '</div></div>';
    if (item.slot === 'trail') return '<div class="preview"><div class="pv-trail">' + [0.3, 0.55, 0.8].map((o) => '<span class="trail" style="position:relative;width:26px;height:26px;opacity:' + o + '">' + dotHTML(item.id, 'span', ';position:absolute;inset:4px') + '</span>').join('') + '<div class="pv-actor" style="width:56px;height:56px">' + orbHTML(prog.equip.orb) + '</div></div></div>';
    if (item.slot === 'portal') { const g = genOf(item.id); return '<div class="preview"><div class="tile floor exit ' + (g ? 'pg pg-' + g.style + '" style="--ts:64px;' + Cos.vars(g) : 'p-' + item.id + '" style="--ts:64px') + '"></div></div>'; }
    const icon = { hint: 'i-bulb', moves: 'i-plus', luck: 'i-bolt', skip: 'i-skip' }[item.boost];
    return '<div class="preview"><svg style="width:46px;height:46px;color:var(--gold)"><use href="#' + icon + '"/></svg></div>';
  }
  function renderShop() {
    const goal = Shop.nextGoal(prog, LEVELS);
    $('#shopGoal').innerHTML = goal
      ? '<span class="dc-ico"><svg><use href="#i-star"/></svg></span><div class="gb-txt"><span class="coach-tag">NEXT UNLOCK</span><b>' + esc(goal.text) + '</b>' +
        (goal.item.price ? '<div class="bar2"><i style="width:' + Math.min(100, Math.round((prog.coins / goal.item.price) * 100)) + '%"></i></div>' : '') + '</div>'
      : '<div class="gb-txt"><b>You own everything. Legend!</b></div>';
    $('#shopTabs').innerHTML = Object.keys(TAB_NAMES).map((k) => '<button class="tab" role="tab" data-tab="' + k + '" aria-selected="' + (k === shopTab) + '">' + TAB_NAMES[k] + '</button>').join('');
    $$('#shopTabs .tab').forEach((b) => (b.onclick = () => { shopTab = b.dataset.tab; SFX.click(); renderShop(); }));
    const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
    const list = Shop.CATALOG.filter((c) => c.slot === shopTab);
    if (shopTab !== 'boost') list.sort((a, b) => (b.default ? 1 : 0) - (a.default ? 1 : 0) || RANK[a.rarity] - RANK[b.rarity] || (a.price || 1e9) - (b.price || 1e9));
    let lastRarity = null;
    $('#shopGrid').innerHTML = list.map((it) => {
      const head = shopTab !== 'boost' && !it.default && it.rarity !== lastRarity ? '<div class="rarity-head" style="--rc:' + Chars.RARITY[it.rarity].color + '">' + Chars.RARITY[it.rarity].label + ' · ' + list.filter((q) => q.rarity === it.rarity && !q.default).length + (shopTab === 'face' ? ' characters' : ' items') + '</div>' : '';
      if (shopTab !== 'boost' && !it.default) lastRarity = it.rarity;
      const owned = it.slot !== 'boost' && Shop.owns(prog, LEVELS, it), on = owned && prog.equip[it.slot] === it.id, gate = it.gate ? Shop.gateStatus(prog, LEVELS, it.gate) : null;
      let btn;
      if (it.slot === 'boost') btn = '<button class="btn gold" data-buy="' + it.id + '"' + (prog.coins < it.price ? ' disabled' : '') + '><i class="coin-ico" style="width:18px;height:18px"></i>' + it.price + '</button>';
      else if (on) btn = '<button class="btn on" disabled>Equipped</button>';
      else if (owned) btn = '<button class="btn" data-equip="' + it.id + '">Equip</button>';
      else if (gate && !gate.met) btn = '<div class="gate"><small><svg><use href="#i-lock"/></svg><b>Step 1:</b> ' + esc(gate.text) + '</small><div class="bar2"><i style="width:' + Math.round(gate.progress * 100) + '%"></i></div>' +
        '<small>' + gate.have.toLocaleString('en-US') + ' / ' + gate.need.toLocaleString('en-US') + ' · <b>Step 2:</b> ' + it.price.toLocaleString('en-US') + ' coins</small></div><button class="btn" data-why="' + it.id + '"><svg><use href="#i-lock"/></svg>Locked</button>';
      else if (it.price) btn = (prog.coins < it.price ? '<small class="need">' + (it.price - prog.coins).toLocaleString('en-US') + ' more coins needed</small>' : '') + '<button class="btn gold" data-buy="' + it.id + '"' + (prog.coins < it.price ? ' disabled' : '') + '><i class="coin-ico" style="width:18px;height:18px"></i>' + it.price.toLocaleString('en-US') + '</button>';
      else btn = '<button class="btn" data-why="' + it.id + '"><svg><use href="#i-lock"/></svg>Locked</button>';
      const tag = it.milestone ? (owned ? 'EARNED REWARD' : 'REWARD: ' + Shop.milestoneText(it).toUpperCase()) : it.default ? 'STARTER' : it.slot === 'boost' ? 'BOOST' : gate ? (owned ? 'LEGENDARY · YOURS' : gate.met ? 'LEGENDARY · UNLOCKED FOR SALE' : 'LEGENDARY · MILESTONE + COINS') : 'SHOP';
      return head + '<div class="item' + (it.rarity && shopTab !== 'boost' ? ' r-' + it.rarity : '') + (on ? ' equipped' : '') + (!owned && it.slot !== 'boost' && !it.price ? ' locked' : '') + '">' +
        (it.slot === 'boost' ? '<span class="owned-n">×' + prog.inv[it.boost] + '</span>' : '') + previewHTML(it) +
        '<span class="tagline">' + esc(tag) + '</span><h4>' + esc(it.name) + '</h4>' +
        (it.aura ? '<span class="aura-tag">AURA · ' + esc(Shop.AURAS[it.aura].name.toUpperCase()) + '</span>' : '') + '<p>' + esc(it.desc) + '</p>' +
        (it.aura ? '<button class="plan-btn" data-aurapv="' + it.aura + '">Preview aura</button>' : '') + btn + '</div>';
    }).join('');
    // previews show the item itself, not the equipped one
    $$('#shopGrid [data-buy]').forEach((b) => (b.onclick = () => {
      const it = Shop.byId(b.dataset.buy), r = Shop.buy(prog, LEVELS, it.id);
      if (!r.ok) { toast(r.reason); SFX.echoBlocked(); return; }
      if (it.slot !== 'boost') Shop.equip(prog, LEVELS, it.id);
      persist(); applySettings(); SFX.win(); buzz(30); confetti();
      toast(it.slot === 'boost' ? it.name + ' added. You have ' + prog.inv[it.boost] + '.' : it.name + ' unlocked and equipped!');
      coins(); renderShop();
    }));
    $$('#shopGrid [data-aurapv]').forEach((b) => (b.onclick = () => {
      if (reduced()) { toast('Auras are off while Reduce motion is on.'); return; }
      clearTimeout(auraPreview); auraPreview = setTimeout(() => { auraPreview = null; applyAura(); }, 6000);
      Amb.setMode(b.dataset.aurapv); SFX.favour();
      if (b.dataset.aurapv === 'storm') { const [x, y] = center(b); setTimeout(() => { Amb.strike(x, y - 120); SFX.thunder(); }, 300); }
      toast(Shop.AURAS[b.dataset.aurapv].name + ': ' + Shop.AURAS[b.dataset.aurapv].desc);
    }));
    // tap a character to see its moods; hover makes it happy
    $$('#shopGrid .charpv').forEach((b) => {
      const box = b.querySelector('.charbox'), moods = ['happy', 'dizzy', 'sleep', ''];
      let k = 0;
      b.onclick = () => { ['happy', 'dizzy', 'sleep'].forEach((m) => box.classList.remove('mood-' + m)); const m = moods[k++ % moods.length]; if (m) box.classList.add('mood-' + m); (m === 'dizzy' ? SFX.echoBlocked : m === 'sleep' ? SFX.undo : SFX.fire)(); };
      b.onpointerenter = () => { if (!box.className.includes('mood-')) box.classList.add('mood-happy'); };
      b.onpointerleave = () => box.classList.remove('mood-happy');
      b.onpointermove = (ev) => { const r = b.getBoundingClientRect(); box.style.setProperty('--px', ((ev.clientX - r.left) / r.width - 0.5) * 9 + 'px'); box.style.setProperty('--py', ((ev.clientY - r.top) / r.height - 0.5) * 8 + 'px'); };
    });
    $$('#shopGrid [data-why]').forEach((b) => (b.onclick = () => {
      const it = Shop.byId(b.dataset.why), g = it.gate && Shop.gateStatus(prog, LEVELS, it.gate);
      SFX.echoBlocked();
      toast(g ? 'Locked. First: ' + g.text + ' (you have ' + g.have.toLocaleString('en-US') + ' of ' + g.need.toLocaleString('en-US') + '). Then it costs ' + it.price.toLocaleString('en-US') + ' coins.' : it.milestone ? 'Locked. Free reward: ' + Shop.milestoneText(it) + '.' : 'Locked.');
    }));
    $$('#shopGrid [data-equip]').forEach((b) => (b.onclick = () => { Shop.equip(prog, LEVELS, b.dataset.equip); persist(); applySettings(); SFX.click(); renderShop(); }));
    coins();
  }

  /* ================= rewards hub: quests, wheel, chests, achievements, stats ================= */
  let rwTab = 'quests', wheelRot = 0, spinning = false;
  const RW_TABS = { quests: 'Quests', wheel: 'Wheel', chests: 'Chests', ach: 'Achievements', stats: 'Stats' };
  const BAND = ['EASY', 'MEDIUM', 'HARD'];
  const chestChip = (t) => '<span class="chest-chip" style="--cc:' + R.CHESTS[t].color + '">' + chestSVG(t) + R.CHESTS[t].name + '</span>';
  function renderRewards() {
    const day = today(); R.ensureQuests(prog, day);
    const badge = {
      quests: prog.quests.list.filter((q) => !q.claimed && q.n >= R.qById(q.id).goal).length, wheel: R.spinsAvailable(prog, day),
      chests: prog.chestQueue.length, ach: R.ACH.filter((a) => R.achState(prog, LEVELS, a).claimable).length, stats: 0,
    };
    $('#rwTabs').innerHTML = Object.keys(RW_TABS).map((k) => '<button class="tab" role="tab" data-tab="' + k + '" aria-selected="' + (k === rwTab) + '">' + RW_TABS[k] + (badge[k] ? '<span class="tbadge">' + badge[k] + '</span>' : '') + '</button>').join('');
    $$('#rwTabs .tab').forEach((b) => (b.onclick = () => { if (spinning) return; rwTab = b.dataset.tab; SFX.click(); renderRewards(); }));
    ({ quests: rwQuests, wheel: rwWheel, chests: rwChests, ach: rwAch, stats: rwStats })[rwTab](day);
    coins();
  }
  function rwQuests(day) {
    const Q = prog.quests, allClaimed = Q.list.every((q) => q.claimed);
    $('#rwBody').innerHTML = '<div class="rw-head"><b>Daily quests</b><small>New quests in ' + untilTomorrow() + '. Everyone gets the same three each day.</small></div>' +
      Q.list.map((q, i) => {
        const d = R.qById(q.id), done = q.n >= d.goal;
        return '<div class="quest' + (q.claimed ? ' claimed' : done ? ' done' : '') + '"><span class="q-band b' + i + '">' + BAND[i] + '</span><div class="q-main"><b>' + esc(d.text) + '</b>' +
          '<div class="bar2"><i style="width:' + Math.round((q.n / d.goal) * 100) + '%"></i></div><small>' + q.n + ' / ' + d.goal + '</small></div>' +
          '<div class="q-rew"><span><i class="coin-ico"></i>' + d.reward.coins + '</span>' + (d.reward.chest ? chestChip(d.reward.chest) : '') + '</div>' +
          (q.claimed ? '<button class="btn" disabled>Claimed ✓</button>' : done ? '<button class="btn gold" data-q="' + q.id + '">Claim</button>' : '<button class="btn" disabled>In progress</button>') + '</div>';
      }).join('') +
      '<div class="quest bonus' + (Q.bonus ? ' claimed' : '') + '"><span class="q-band b2">BONUS</span><div class="q-main"><b>Claim all three quests</b><small>' + (Q.bonus ? 'Earned today ✓' : Q.list.filter((q) => q.claimed).length + ' / 3 claimed') + '</small></div>' +
      '<div class="q-rew"><span><svg><use href="#i-wheel"/></svg>+1 spin</span>' + chestChip('bronze') + '</div></div>' +
      '<p class="rw-tip">Quest progress is counted when you <b>clear</b> a level, so undoing moves cannot fake it. ' + (allClaimed ? 'All done for today: come back in ' + untilTomorrow() + '.' : '') + '</p>';
    $$('#rwBody [data-q]').forEach((b) => (b.onclick = () => {
      const r = R.claimQuest(prog, day, b.dataset.q); if (!r) return;
      persist(); SFX.win(); buzz(30); confetti();
      toast('+' + r.coins + ' coins' + (r.chest ? ' and a ' + R.CHESTS[r.chest].name : '') + (r.bonus ? '. All quests done: +1 spin and a Bronze chest!' : '.'));
      renderRewards();
    }));
  }
  function wheelSVG() {
    const n = R.SEGMENTS.length, step = 360 / n, P2 = (r, a) => [(r * Math.sin((a * Math.PI) / 180)).toFixed(2), (-r * Math.cos((a * Math.PI) / 180)).toFixed(2)];
    let g = '';
    R.SEGMENTS.forEach((sg, i) => {
      const a0 = i * step - step / 2, a1 = a0 + step, [x0, y0] = P2(100, a0), [x1, y1] = P2(100, a1);
      g += '<path class="seg" data-i="' + i + '" d="M0 0L' + x0 + ' ' + y0 + 'A100 100 0 0 1 ' + x1 + ' ' + y1 + 'Z" fill="' + sg.color + '"' + (i % 2 ? ' opacity=".86"' : '') + '/>';
      g += '<g transform="rotate(' + i * step + ')"><text y="-62" text-anchor="middle" class="seg-t' + (sg.jackpot ? ' jp' : '') + '">' + esc(sg.label) + '</text>' +
        (sg.k === 'coins' && !sg.jackpot ? '<circle cy="-40" r="7" class="seg-coin"/>' : '') + '</g>';
    });
    for (let i = 0; i < n * 2; i++) { const [x, y] = P2(104, (i * step) / 2); g += '<circle cx="' + x + '" cy="' + y + '" r="2.6" class="bulb' + (i % 2 ? ' b2' : '') + '"/>'; }
    return '<svg class="wheel" id="wheel" viewBox="-110 -110 220 220" style="transform:rotate(' + wheelRot + 'deg)"><circle r="108" class="rim"/>' + g + '</svg>';
  }
  function rwWheel(day) {
    const n = R.spinsAvailable(prog, day), free = prog.wheel.freeDay !== day, tot = R.SEGMENTS.reduce((a, s) => a + s.w, 0);
    $('#rwBody').innerHTML = '<div class="wheel-layout"><div class="wheel-wrap"><div class="wheel-ptr" id="wPtr"></div>' + wheelSVG() +
      '<button class="wheel-hub" id="wSpin"' + (n ? '' : ' disabled') + '>' + (n ? 'SPIN' : '<svg><use href="#i-lock"/></svg>') + '</button></div>' +
      '<div class="wheel-side card"><div id="wResult" class="w-result">' + (n ? '<b>' + (free ? 'Your free daily spin is ready!' : plural(n, 'spin') + ' ready') + '</b>' + (free && prog.wheel.spins ? '<small>+' + prog.wheel.spins + ' banked</small>' : '')
        : '<b>No spins right now</b><small>Next free spin in ' + untilTomorrow() + '.</small>') + '</div>' +
      '<h3>How to get spins</h3><ul class="help-list"><li>1 free spin every day</li><li>Clear the Daily Echo: +1</li><li>Claim all 3 daily quests: +1</li><li>Achievement tiers 2 and up: +1 each</li><li>Gold chests (20%) and Mythic chests (always): +1</li></ul>' +
      '<p class="small dim">You can bank up to ' + R.MAX_SPINS + ' extra spins (' + prog.wheel.spins + ' banked). <b>Lucky streak:</b> after 4 spins without a chest, the next one always lands on a chest or the jackpot (' + Math.min(4, prog.wheel.dry) + ' / 4).</p>' +
      '<h3>Odds</h3><div class="odds">' + R.SEGMENTS.map((sg) => '<span><i style="background:' + sg.color + '"></i>' + esc(sg.label) + (sg.k === 'coins' && !sg.jackpot ? ' coins' : sg.k === 'chest' ? ' chest' : sg.jackpot ? ' (2,000)' : '') + ' <b>' + Math.round((sg.w / tot) * 100) + '%</b></span>').join('') + '</div></div></div>';
    $('#wSpin').onclick = () => spinWheel(day);
  }
  function spinWheel(day) {
    if (spinning) return;
    const res = R.spin(prog, day); if (!res) { toast('No spins left. Next free spin in ' + untilTomorrow() + '.'); return; }
    persist(); spinning = true; SFX.click();
    $('#wSpin').disabled = true; $('#wResult').innerHTML = '<b>Spinning…</b>';
    const wheel = $('#wheel'), step = 360 / R.SEGMENTS.length;
    const want = (((-res.idx * step - wheelRot) % 360) + 360) % 360, jitter = (Math.random() - 0.5) * step * 0.6;
    const from = wheelRot, to = wheelRot + 5 * 360 + want + jitter, dur = reduced() ? 400 : 4600, t0 = performance.now();
    let lastSeg = Math.floor((from + step / 2) / step);
    const ease = (k) => 1 - Math.pow(1 - k, 4);
    const frame = (t) => {
      const k = Math.min(1, (t - t0) / dur), rot = from + (to - from) * ease(k);
      wheel.style.transform = 'rotate(' + rot + 'deg)';
      const sg = Math.floor((rot + step / 2) / step);
      if (sg !== lastSeg) { lastSeg = sg; SFX.tape(sg % 5); const p = $('#wPtr'); if (p) anim(p, [{ transform: 'translateX(-50%) rotate(-18deg)' }, { transform: 'translateX(-50%) rotate(0)' }], { duration: 120 }); }
      if (k < 1) requestAnimationFrame(frame); else done(rot);
    };
    requestAnimationFrame(frame);
    function done(rot) {
      wheelRot = rot % 360; spinning = false;
      const seg = res.seg, el = $('#wheel .seg[data-i="' + res.idx + '"]'); if (el) el.classList.add('win');
      const [x, y] = center($('#wheel'));
      if (seg.jackpot) { SFX.thunder(); Amb.flash(); Amb.burst('confetti', x, y, 60); Amb.burst('stars', x, y, 30, '#ffc24b'); confetti(); buzz([40, 40, 120]); }
      else { SFX.win(); Amb.burst('sparks', x, y - 100, 18, seg.color); buzz(30); }
      const what = seg.k === 'coins' ? '+' + seg.n.toLocaleString('en-US') + ' coins' + (seg.jackpot ? '. JACKPOT!' : '') : seg.k === 'boost' ? seg.label + ' added to your boosts' : 'A ' + R.CHESTS[seg.tier].name + '!';
      const left = R.spinsAvailable(prog, day);
      $('#wResult').innerHTML = '<b class="win-line">' + esc(what) + '</b>' + (res.pity ? '<small>Lucky streak paid out.</small>' : '') +
        (res.quests && res.quests.length ? '<small>Quest complete: ' + esc(res.quests[0].text) + '</small>' : '') +
        '<div class="row" style="margin-top:8px">' + (seg.k === 'chest' ? '<button class="btn gold" id="wOpen"><svg><use href="#i-chest"/></svg>Open it now</button>' : '') +
        (left ? '<button class="btn' + (seg.k === 'chest' ? '' : ' gold') + '" id="wAgain">Spin again (' + left + ')</button>' : '<small>Next free spin in ' + untilTomorrow() + '.</small>') + '</div>';
      on('wOpen', () => revealChests(renderRewards));
      on('wAgain', () => { renderRewards(); });
      coins();
    }
  }
  function rwChests() {
    const q = prog.chestQueue, C = R.CHESTS;
    const pct = (x) => Math.round(x * 100) + '%';
    $('#rwBody').innerHTML = '<div class="rw-head"><b>' + (q.length ? plural(q.length, 'chest') + ' waiting' : 'No chests waiting') + '</b><small>' + (q.length ? 'Open them one by one: tap each chest three times.' : 'Earn chests by playing; see below.') + '</small></div>' +
      (q.length ? '<div class="chest-queue">' + q.map((c) => '<div class="cq" style="--cc:' + C[c.tier].color + '">' + chestSVG(c.tier) + '<b>' + C[c.tier].name + '</b><small>' + esc(c.source) + '</small></div>').join('') + '</div><div class="row"><button class="btn gold big" id="cqOpen"><svg><use href="#i-chest"/></svg>Open ' + (q.length > 1 ? 'chests' : 'chest') + '</button></div>' : '') +
      '<div class="rw-grid"><div class="card"><h3>How to earn chests</h3><ul class="help-list">' +
      '<li>' + chestChip('bronze') + ' every 3rd new level you clear</li><li>' + chestChip('silver') + ' every 10 stars you earn</li>' +
      '<li>' + chestChip('gold') + ' first clear of a boss level (every 10th), plus ' + chestChip('silver') + ' if you reach par</li>' +
      '<li>' + chestChip('mythic') + ' for clearing every level in a world</li><li>' + chestChip('gold') + ' every 7 days of Daily Echo streak</li>' +
      '<li>Hard daily quests, the all-quests bonus, achievements and the wheel also give chests.</li></ul></div>' +
      '<div class="card"><h3>What is inside</h3><table class="chest-table"><tr><th></th><th>Coins</th><th>Boosts</th><th>New cosmetic</th><th>Extra</th></tr>' +
      Object.keys(C).map((k) => { const t = C[k]; return '<tr><td>' + chestChip(k) + '</td><td>' + t.coins[0] + '–' + t.coins[1] + '</td><td>' + (t.boosts || pct(t.boostChance) + ' for 1') + '</td><td>' + (t.cos ? pct(t.cos) + ' ' + t.cosR.join('/') : '—') + '</td><td>' + [t.spin ? pct(t.spin) + ' spin' : '', t.luck ? pct(t.luck) + ' Clover' : ''].filter(Boolean).join(', ') + '</td></tr>'; }).join('') +
      '</table><p class="small dim">Legendary items never drop from chests: they keep their value. If you already own every item a chest could drop, you get bonus coins instead.</p></div></div>';
    on('cqOpen', () => revealChests(renderRewards));
  }
  function rwAch() {
    $('#rwBody').innerHTML = '<div class="rw-head"><b>Achievements</b><small>Permanent goals with tiers. Each tier pays coins and a chest; tier 2 and up also give a wheel spin.</small></div><div class="ach-list">' +
      R.ACH.map((a) => {
        const st = R.achState(prog, LEVELS, a), pct = st.done ? 100 : Math.min(100, Math.round((st.have / st.next) * 100));
        return '<div class="ach' + (st.claimable ? ' ready' : '') + (st.done ? ' done' : '') + '"><div class="ach-top"><b>' + esc(a.name) + '</b><span class="pips">' + a.tiers.map((_, i) => '<i class="' + (i < st.claimed ? 'on' : '') + '"></i>').join('') + '</span></div>' +
          '<small>' + (st.done ? 'All ' + a.tiers.length + ' tiers complete!' : 'Tier ' + (st.claimed + 1) + ': ' + st.next.toLocaleString('en-US') + ' ' + esc(a.unit) + ' · you have ' + st.have.toLocaleString('en-US')) + '</small>' +
          (st.done ? '' : '<div class="bar2"><i style="width:' + pct + '%"></i></div><div class="ach-rew"><span><i class="coin-ico"></i>' + st.reward.coins.toLocaleString('en-US') + '</span>' + chestChip(st.reward.chest) + (st.claimed >= 1 ? '<span><svg><use href="#i-wheel"/></svg>+1</span>' : '') +
            (st.claimable ? '<button class="btn gold" data-ach="' + a.id + '">Claim</button>' : '') + '</div>') + '</div>';
      }).join('') + '</div>';
    $$('#rwBody [data-ach]').forEach((b) => (b.onclick = () => {
      const r = R.claimAch(prog, LEVELS, b.dataset.ach); if (!r) return;
      persist(); SFX.win(); confetti(); toast('+' + r.coins.toLocaleString('en-US') + ' coins and a ' + R.CHESTS[r.chest].name + (r.spin ? ' and a wheel spin' : '') + '!'); renderRewards();
    }));
  }
  function rwStats(day) {
    const st = prog.stats, sv = (k) => Shop.statValue(prog, LEVELS, k);
    const cleared = LEVELS.filter((l) => prog.levels[l.id] && prog.levels[l.id].clears).length;
    const gentlePct = st.echoSteps + st.echoBumps ? Math.round((st.echoSteps / (st.echoSteps + st.echoBumps)) * 100) + '%' : '—';
    const own = (slot) => { const all = Shop.CATALOG.filter((c) => c.slot === slot && !c.default); return all.filter((c) => Shop.owns(prog, LEVELS, c)).length + ' / ' + all.length; };
    const rows = [['Stars', sv('stars') + ' / ' + LEVELS.length * 3], ['Levels cleared', cleared + ' / ' + LEVELS.length], ['Levels at par', sv('perfect')], ['Worlds cleared', sv('worlds') + ' / ' + WORLDS.length],
      ['Clover', prog.luck + ' / 100'], ['Echo steps', st.echoSteps], ['Echo bumps', st.echoBumps], ['Echo care', gentlePct], ['Gentle clears', st.gentle], ['Moves made', st.moves], ['Favours used', st.favours],
      ['Chests opened', st.chests], ['Wheel spins', st.spins], ['Jackpots', st.jackpots], ['Coins earned', st.coinsEarned], ['Best daily streak', sv('streak')], ['Achievement tiers', sv('achievements')],
      ['Characters', own('face')], ['Orbs', own('orb')], ['Trails', own('trail')], ['Portals', own('portal')]];
    const GO = { campaign: 'Play', daily: 'Play', wheel: 'Spin', quests: 'Open', chests: 'Open', ach: 'Open', replay: 'Map' };
    $('#rwBody').innerHTML = '<div class="rw-grid"><div class="card"><h3>Ways to earn coins right now</h3><div class="earn-list">' +
      R.earnings(prog, LEVELS, day).map((e) => '<div class="earn' + (e.ok ? ' ok' : '') + '"><i>' + (e.ok ? '●' : '○') + '</i><span>' + esc(e.text) + '</span>' + (e.ok ? '<button class="plan-btn" data-earn="' + e.id + '">' + GO[e.id] + '</button>' : '') + '</div>').join('') + '</div></div>' +
      '<div class="card"><h3>Your stats</h3><div class="stat-grid">' + rows.map((r) => '<div class="stat"><span>' + r[0].toUpperCase() + '</span><b>' + (typeof r[1] === 'number' ? r[1].toLocaleString('en-US') : r[1]) + '</b></div>').join('') + '</div></div></div>';
    $$('#rwBody [data-earn]').forEach((b) => (b.onclick = () => {
      SFX.click(); const k = b.dataset.earn;
      if (k === 'campaign') startLevel(P.nextLevelIndex(prog, LEVELS)); else if (k === 'daily') playDaily(); else if (k === 'replay') { mapSel = null; mapWorld = null; show('map'); }
      else { rwTab = { wheel: 'wheel', quests: 'quests', chests: 'chests', ach: 'ach' }[k]; renderRewards(); }
    }));
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
        say([{ h: 'This position can no longer be won. Undo a few moves or restart.', c: 'bad' }]); renderPanel();
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
    el.style.transform = tr(x, y);
    actorsEl.appendChild(el);
    const a = anim(el, [{ opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1.2, offset: 0.3 }, { opacity: 0, scale: 1 }], { duration: 520 });
    if (a) a.onfinish = () => el.remove(); else el.remove();
  }
  function ripple(x, y, color) {
    if (reduced()) return;
    const el = document.createElement('div');
    el.className = 'actor instant';
    el.style.transform = tr(x, y);
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
  /* Floors light up under your steps; on reactive and boss levels a wave rolls out from you on
     every move and the frame beats when an echo acts. */
  function floorFx(prev, next, fired) {
    if (reduced()) return;
    const px = next.player.x, py = next.player.y, T = trailOf(prog.equip.trail);
    const glow = T.color === 'hue' ? 'hsl(' + ((next.moves * 47) % 360) + ',90%,65%)' : T.color || getComputedStyle(document.body).getPropertyValue('--glow').trim() || '#4fe3ff';
    const from = tileRect(prev.player.x, prev.player.y), to = tileRect(px, py);
    if (to && (T.burst || T.bolt)) {
      const tx = to.left + to.width / 2, ty = to.top + to.height / 2;
      if (T.bolt && from) { Amb.bolt(from.left + from.width / 2, from.top + from.height / 2, tx, ty, '#bfeaff', 2.4); }
      if (T.burst) Amb.burst(T.burst, tx, ty, 10, T.burstColor);
    }
    const lightTile = (x, y, delay, strength, dur) => {
      const el = tileEls[y] && tileEls[y][x]; if (!el || el.classList.contains('wall')) return;
      const l = document.createElement('i'); l.className = 'lit'; l.style.background = glow; l.style.opacity = 0;
      el.appendChild(l);
      const a = l.animate([{ opacity: 0 }, { opacity: strength, offset: 0.25 }, { opacity: 0 }], { duration: dur, delay, easing: 'ease-out' });
      a.onfinish = () => l.remove();
    };
    lightTile(px, py, 0, 0.28, 700);
    if (!G.react) return;
    const L = G.L;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const d = Math.abs(x - px) + Math.abs(y - py);
      if (d > 0 && d <= 6) lightTile(x, y, d * 45, 0.16 * (1 - d / 7), 520);
    }
    const strong = fired.size > 0;
    anim($('#frame'), [{ transform: 'scale(1)' }, { transform: strong ? 'scale(1.012)' : 'scale(1.004)' }, { transform: 'scale(1)' }], { duration: strong ? 320 : 180 });
  }
  function fx(prev, next, events, meta) {
    const fired = new Set(events.filter((e) => e.echo).map((e) => e.echo));
    if (meta.kind === 'move') floorFx(prev, next, fired);
    if (meta.kind === 'move') {
      const p = actorEls.get('player');
      if (p) anim(p.querySelector('.orb'), [{ transform: 'scale(1.2,.82)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      if (!fired.size) {
        const maxC = Math.max(0, ...next.echoes.map((e) => e.counter));
        if (maxC > 0) SFX.tape(maxC - 1); else SFX.move();
      }
    }
    for (const e of events) {
      if (e.type === 'ECHO_MOVED') {
        const ec = next.echoes.find((q) => q.id === e.echo); ripple(ec.x, ec.y, ECHO_INFO[ec.type].color); SFX.fire(); buzz(15); mood(e.echo, 'happy', 750);
        if (prog.luck < R.LUCK.max) floatText(ec.x, ec.y, '+' + R.LUCK.step + ' clover', '#6dffb3');
        const ael = actorEls.get('echo' + e.echo), aura = Amb.mode();
        if (ael && aura && !reduced()) {
          const [x, y] = center(ael);
          if (aura === 'storm') { Amb.strike(x, y); SFX.thunder(); } else if (AURA_BURST[aura]) Amb.burst(AURA_BURST[aura], x, y, 16);
        }
      }
      if (e.type === 'BUILD' || (e.type === 'HELPER' && /sends|reached/.test(e.text))) mood(e.echo, 'happy', 750);
      if (e.type === 'ECHO_BLOCKED') {
        SFX.echoBlocked(); mood(e.echo, 'dizzy', 1000);
        const el = actorEls.get('echo' + e.echo);
        if (/tries/.test(e.text)) { const ec = next.echoes.find((q) => q.id === e.echo); if (ec) floatText(ec.x, ec.y, R.LUCK.bump + ' clover', '#ff5c8a'); anim($('#cloverMeter'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 260 }); }
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
      $$('.charbox').forEach((b) => b.classList.add('party'));
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
    let receipt;
    if (G.daily) {
      const stars = P.starsFor(S.moves, L.par), d = P.applyDaily(prog, today(), S.moves <= L.par && !G.usedHint);
      const rec = P.record(prog, L.id); rec.best = rec.best === null ? S.moves : Math.min(rec.best, S.moves); rec.stars = Math.max(rec.stars, stars);
      receipt = { lines: d.lines.length ? d.lines : [{ label: 'Already claimed today', value: 0, tone: 'dim' }], total: d.total, stars, best: rec.best, first: false, newBest: false,
        next: 'Daily streak: ' + (d.streak || P.dailyStatus(prog, today()).streak) + ' day(s). A new Daily Echo appears tomorrow; keep the streak alive for bigger bonuses.' };
      if (d.total) receipt.dailyBonus = R.onDaily(prog, d.streak);
    } else receipt = P.applyClear(prog, L, { moves: S.moves, collected, usedHint: G.usedHint, assisted: G.movesUsed }, Date.now());
    const luck0 = prog.luck;
    const book = R.onClear(prog, LEVELS, { level: G.def, stars: receipt.stars, perfect: !!L.par && S.moves <= L.par, bumps: G.bumps, hasEchoes: S.echoes.length > 0, usedHint: G.usedHint,
      undos: G.undos, first: !!receipt.first, daily: G.daily, coinsTotal: receipt.total, steps: G.steps, coins: collected, favours: G.favours }, today());
    if (receipt.dailyBonus && receipt.dailyBonus.chest) book.chests.push(receipt.dailyBonus.chest);
    const unlocked = Shop.newUnlocks(prog, LEVELS), goal = Shop.nextGoal(prog, LEVELS);
    persist();
    const chestRow = book.chests.length ? '<div class="won-chests">' + book.chests.map((t, i) => '<div class="wc" style="--cc:' + R.CHESTS[t].color + ';animation-delay:' + (0.9 + i * 0.15) + 's">' + chestSVG(t) + '<small>' + R.CHESTS[t].name + '</small></div>').join('') + '</div>' : '';
    const extras = (book.gentle ? '<div class="note clover-note"><svg><use href="#i-clover"/></svg><span><b>Gentle clear:</b> no echo bumped into anything. ' + (prog.luck > luck0 ? 'Clover +' + (prog.luck - luck0) + ' (now ' + prog.luck + '/100).' : 'Your Clover is full: use its free Favour in any level.') + '</span></div>'
      : S.echoes.length && G.bumps ? '<div class="note"><svg style="color:var(--pink)"><use href="#i-clover"/></svg><span>Your echoes bumped ' + plural(G.bumps, 'time') + '. Clear with no bumps for +' + R.LUCK.gentle + ' Clover.</span></div>' : '') +
      book.quests.map((q) => '<div class="note quest-note"><svg><use href="#i-flame"/></svg><span><b>Quest complete:</b> ' + esc(q.text) + '. Claim it in Rewards.</span></div>').join('') +
      (receipt.dailyBonus ? '<div class="note"><svg><use href="#i-wheel"/></svg><span><b>Daily bonus:</b> +1 wheel spin' + (receipt.dailyBonus.chest ? ' and a Gold chest for your streak' : '') + '.</span></div>' : '');
    const last = G.idx === LEVELS.length - 1;
    openModal(
      '<div class="rays"></div><div class="kicker">WORLD ' + G.def.world + ' · LEVEL ' + L.id + ' · ' + esc(L.name).toUpperCase() + '</div>' +
      '<h2 class="win-title">' + (last ? 'ALL CLEAR!' : G.def.id % 10 === 0 ? 'WORLD CLEAR!' : 'LEVEL CLEAR!') + '</h2>' +
      '<div class="big-stars">' + [1, 2, 3].map((k) => '<svg class="' + (k <= receipt.stars ? 'lit' : '') + '" style="animation-delay:' + (0.2 + k * 0.18) + 's"><use href="#i-star"/></svg>').join('') + '</div>' +
      '<div class="stats-row"><span>Moves <b>' + S.moves + '</b>' + (L.par ? ' / par ' + L.par : '') + '</span><span>Best <b>' + receipt.best + '</b>' + (receipt.newBest && !receipt.first ? ' · new best!' : '') + '</span></div>' +
      '<div class="receipt">' + receipt.lines.map((r, i) => '<div class="r ' + r.tone + '" style="animation-delay:' + (0.5 + i * 0.12) + 's"><span>' + esc(r.label) + '</span><span>+' + r.value + '</span></div>').join('') +
      '<hr><div class="total"><span class="disp" style="font-size:22px">Total</span><b><i class="coin-ico"></i><span id="countUp">+0</span></b></div></div>' +
      (chestRow ? '<div class="kicker" style="margin-top:4px">' + (book.chests.length > 1 ? book.chests.length + ' CHESTS EARNED' : 'CHEST EARNED') + '</div>' + chestRow : '') + extras +
      '<div class="note lesson"><svg><use href="#i-bulb"/></svg><span><b>You learned:</b> ' + esc(L.lesson || G.def.lesson) + '</span></div>' +
      unlocked.map((it) => '<div class="unlock-card"><svg style="color:var(--mint)"><use href="#i-star"/></svg><span><b>New unlock:</b> ' + esc(it.name) + ' (' + esc(it.slot === 'face' ? 'echo face' : it.slot) + '). Equip it in the Shop.</span></div>').join('') +
      (goal ? '<div class="note"><svg><use href="#i-bag"/></svg><span><b>Next unlock:</b> ' + esc(goal.text) + '</span></div>' : '') +
      '<div class="note"><svg><use href="#i-restart"/></svg><span>' + esc(receipt.next) + '</span></div>' +
      (last ? '<p>You finished every level. More worlds are on the way.</p>' : '') +
      '<div class="row">' + (prog.chestQueue.length ? '<button class="btn chestbtn" id="vChests"><svg><use href="#i-chest"/></svg>Open ' + plural(prog.chestQueue.length, 'chest') + '</button>' : '') + '<button class="btn" id="vMap"><svg><use href="#i-map"/></svg>Map</button><button class="btn" id="vReplay"><svg><use href="#i-restart"/></svg>Replay</button>' +
      (last || G.daily ? '' : '<button class="btn gold big" id="vNext">Next level<svg><use href="#i-play"/></svg></button>') +
      (G.daily ? '<button class="btn gold big" id="vHome">Home<svg><use href="#i-play"/></svg></button>' : '') + '</div>',
      () => {
        on('vMap', () => { mapSel = Math.min(G.idx + 1, LEVELS.length - 1); mapWorld = LEVELS[mapSel].world; show('map'); });
        on('vReplay', () => startLevel(G.idx));
        on('vNext', () => startLevel(G.idx + 1));
        on('vHome', () => show('title'));
        [1, 2, 3].forEach((k) => { if (k <= receipt.stars) setTimeout(() => SFX.star(k), (reduced() ? 0 : 350 + k * 180)); });
        countUp($('#countUp'), receipt.total);
        confetti();
        on('vChests', () => revealChests(() => { coins(); victoryAgain(); }));
        // freshly earned chests descend over the result screen on their own
        if (book.chests.length) G.revealT = setTimeout(() => { if (screen === 'game' && !$('#overlay').hidden && $('#vMap')) revealChests(() => { coins(); victoryAgain(); }); }, reduced() ? 300 : 1900);
      });
  }
  // After a chest reveal, return to the result screen without re-running the rewards.
  function victoryAgain() {
    const btn = $('#vChests');
    if (btn) { if (prog.chestQueue.length) btn.lastChild.textContent = 'Open ' + plural(prog.chestQueue.length, 'chest'); else btn.remove(); }
  }
  /* ---------- chests: a glowing chest descends, you tap it three times, it bursts open ---------- */
  function chestSVG(tier) {
    const c = R.CHESTS[tier].color, gem = tier === 'mythic' ? '#fff' : tier === 'gold' ? '#ff5c8a' : tier === 'silver' ? '#4fe3ff' : '#ffc24b';
    return '<svg class="chest-svg" viewBox="0 0 120 112" aria-hidden="true">' +
      '<g class="c-body"><rect x="12" y="52" width="96" height="52" rx="9" fill="' + c + '"/><rect x="12" y="78" width="96" height="26" rx="9" fill="#00000033"/>' +
      '<rect x="26" y="52" width="10" height="52" fill="#0000002a"/><rect x="84" y="52" width="10" height="52" fill="#0000002a"/><rect x="12" y="52" width="96" height="6" fill="#ffffff44"/></g>' +
      '<g class="c-lid"><path d="M12 54V42a48 28 0 0 1 96 0v12z" fill="' + c + '"/><path d="M12 54V42a48 28 0 0 1 96 0v12z" fill="none" stroke="#00000033" stroke-width="3"/>' +
      '<rect x="26" y="20" width="10" height="34" fill="#0000002a"/><rect x="84" y="20" width="10" height="34" fill="#0000002a"/><path d="M20 30a44 20 0 0 1 80 0" fill="none" stroke="#ffffff55" stroke-width="4" stroke-linecap="round"/></g>' +
      '<g class="c-lock"><rect x="49" y="46" width="22" height="24" rx="5" fill="#2a1a00"/><rect x="52" y="49" width="16" height="18" rx="4" fill="' + gem + '"/><circle cx="60" cy="56" r="2.6" fill="#2a1a00"/><rect x="58.6" y="56" width="2.8" height="7" fill="#2a1a00"/></g></svg>';
  }
  const BOOST_NAME = { hint: ['Hint', 'Hints', 'i-bulb'], moves: ['+3 moves', '+3 moves', 'i-plus'], luck: ['Lucky charm', 'Lucky charms', 'i-bolt'], skip: ['Skip ticket', 'Skip tickets', 'i-skip'] };
  let reveal = null;
  function revealChests(done) {
    if (reveal || !prog.chestQueue.length) { if (done && !reveal) done(); return; }
    clearTimeout(G && G.revealT);
    const el = $('#reveal');
    reveal = { done, taps: 0, state: 'descend', opened: 0 };
    el.hidden = false;
    const stage = () => {
      const c = prog.chestQueue[0], T = R.CHESTS[c.tier];
      reveal.taps = 0; reveal.state = 'descend';
      el.style.setProperty('--cc', T.color);
      el.className = 'reveal t-' + c.tier;
      el.innerHTML = '<div class="rv-rays"></div><div class="rv-glow"></div>' +
        '<div class="rv-head"><div class="kicker">' + (prog.chestQueue.length > 1 ? prog.chestQueue.length + ' CHESTS WAITING' : 'CHEST') + '</div><h2 class="disp">' + esc(T.name) + '</h2><small>' + esc(c.source || '') + '</small></div>' +
        '<button class="rv-chest" id="rvChest" aria-label="Open the chest"><span class="rv-halo"></span><span class="rv-beam"></span>' + chestSVG(c.tier) + '<span class="rv-shadow"></span></button>' +
        '<p class="rv-tap" id="rvTap">' + (reduced() ? 'Tap the chest to open it' : 'Tap the chest 3 times to open it') + '</p>' +
        '<div class="rv-loot" id="rvLoot"></div><div class="rv-actions" id="rvActions"><button class="btn" id="rvLater">Open later</button></div>';
      const chest = $('#rvChest');
      chest.onclick = tapChest;
      $('#rvLater').onclick = () => { SFX.click(); closeReveal(); };
      if (reduced()) { reveal.state = 'idle'; el.classList.add('idle'); return; }
      SFX.favour();
      const a = chest.animate([{ transform: 'translateY(-110vh) scale(.6) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(12px) scale(1.04) rotate(2deg)', opacity: 1, offset: 0.78 }, { transform: 'translateY(0) scale(1) rotate(0)' }], { duration: 1100, easing: 'cubic-bezier(.2,.9,.3,1)' });
      a.onfinish = () => { if (!reveal) return; reveal.state = 'idle'; el.classList.add('idle'); SFX.slam(); buzz(25); const [x, y] = center(chest); Amb.burst('stars', x, y + 40, 14, T.color); };
    };
    function tapChest() {
      if (!reveal || reveal.state !== 'idle') return;
      const chest = $('#rvChest'), need = reduced() ? 1 : 3;
      reveal.taps++;
      if (reveal.taps < need) {
        el.style.setProperty('--charge', reveal.taps / need);
        el.classList.add('charging');
        SFX.tape(reveal.taps + 1); buzz(20 * reveal.taps);
        anim(chest, [{ transform: 'rotate(0)' }, { transform: 'rotate(-' + 5 * reveal.taps + 'deg) scale(1.03)' }, { transform: 'rotate(' + 5 * reveal.taps + 'deg) scale(1.05)' }, { transform: 'rotate(0) scale(1)' }], { duration: 320 });
        $('#rvTap').textContent = reveal.taps === 1 ? 'It\'s waking up… tap again' : 'Almost! One more tap';
        return;
      }
      openIt();
    }
    function openIt() {
      reveal.state = 'open';
      const out = R.openChest(prog, LEVELS); persist();
      const chest = $('#rvChest'), [x, y] = center(chest), T = R.CHESTS[out.tier];
      el.classList.remove('charging'); el.classList.add('opened');
      SFX.win(); buzz([30, 30, 80]); Amb.flash();
      Amb.burst('confetti', x, y, 34); Amb.burst('stars', x, y - 30, 20, T.color); if (out.tier === 'mythic' || out.tier === 'gold') setTimeout(() => Amb.burst('sparks', x, y - 40, 30, '#fff'), 200);
      $('#rvTap').textContent = '';
      const cards = [];
      cards.push('<div class="loot coins"><i class="coin-ico"></i><b id="rvCoins">+0</b><small>coins</small></div>');
      out.boosts.forEach((b) => { const n = BOOST_NAME[b.kind]; cards.push('<div class="loot"><svg><use href="#' + n[2] + '"/></svg><b>×' + b.n + '</b><small>' + (b.n > 1 ? n[1] : n[0]) + '</small></div>'); });
      if (out.item) cards.push('<div class="loot item r-' + out.item.rarity + '" style="--rc:' + Chars.RARITY[out.item.rarity].color + '">' + previewHTML(out.item) + '<b>' + esc(out.item.name) + '</b><small>NEW ' + Chars.RARITY[out.item.rarity].label.toUpperCase() + ' ' + (out.item.slot === 'face' ? 'CHARACTER' : out.item.slot.toUpperCase()) + '</small><button class="btn gold" id="rvEquip">Equip</button></div>');
      if (out.dup) cards.push('<div class="loot"><svg><use href="#i-star"/></svg><b>+' + out.dup + '</b><small>bonus: you own every item this chest could drop</small></div>');
      if (out.spin) cards.push('<div class="loot"><svg><use href="#i-wheel"/></svg><b>+1</b><small>wheel spin</small></div>');
      if (out.luck) cards.push('<div class="loot clover"><svg><use href="#i-clover"/></svg><b>+' + out.luck + '</b><small>Clover</small></div>');
      $('#rvLoot').innerHTML = cards.join('');
      $$('#rvLoot .loot').forEach((c, i) => anim(c, [{ opacity: 0, transform: 'translateY(40px) scale(.6)' }, { opacity: 1, transform: 'translateY(-6px) scale(1.06)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 250 + i * 160, fill: 'backwards', easing: 'cubic-bezier(.3,1.4,.5,1)' }));
      setTimeout(() => { const c = $('#rvCoins'); if (c) countUp(c, out.coins + 0, true); SFX.coin(); }, reduced() ? 0 : 400);
      const eq = $('#rvEquip'); if (eq) eq.onclick = () => { Shop.equip(prog, LEVELS, out.item.id); persist(); applySettings(); SFX.click(); eq.textContent = 'Equipped'; eq.disabled = true; if (G && screen === 'game') { buildBoard(); render(true); } };
      reveal.opened++;
      const more = prog.chestQueue.length;
      $('#rvActions').innerHTML = (more ? '<button class="btn" id="rvLater">Later</button><button class="btn gold big" id="rvNext"><svg><use href="#i-chest"/></svg>Next chest (' + more + ')</button>' : '') + '<button class="btn ' + (more ? '' : 'gold big') + '" id="rvDone">Collect</button>';
      on('rvLater', closeReveal); on('rvDone', closeReveal); on('rvNext', stage);
      coins();
    }
    function closeReveal() { el.hidden = true; el.innerHTML = ''; el.className = 'reveal'; const d = reveal && reveal.done; reveal = null; coins(); if (screen === 'title') renderTitle(); if (d) d(); }
    reveal.close = closeReveal; reveal.tap = tapChest;
    stage();
  }
  function countUp(el, total, now) {
    if (reduced() || total === 0) { el.textContent = '+' + total; coins(); return; }
    const t0 = performance.now() + (now ? 0 : 700), dur = 700;
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
      '<div class="row"><button class="btn" id="fMap"><svg><use href="#i-map"/></svg>Map</button><button class="btn" id="fUndo"><svg><use href="#i-undo"/></svg>Undo</button>' +
      (prog.inv.moves && !G.movesUsed ? '<button class="btn boost" id="fMoves"><svg><use href="#i-plus"/></svg>+3 moves (×' + prog.inv.moves + ')</button>' : '') +
      '<button class="btn gold big" id="fRetry"><svg><use href="#i-restart"/></svg>Retry</button></div>',
      () => { on('fMoves', () => { closeModal(); boostMoves(); }); on('fMap', () => { mapSel = G.idx; mapWorld = G.def.world; show('map'); }); on('fUndo', () => { closeModal(); undo(); }); on('fRetry', restart); });
  }
  function pause() {
    openModal('<h2>Paused</h2><p>' + esc(G.def.name) + ' · ' + G.S.moves + ' moves so far</p>' +
      '<div class="row"><button class="btn gold big" id="pResume"><svg><use href="#i-play"/></svg>Resume</button></div>' +
      '<div class="row"><button class="btn" id="pRestart"><svg><use href="#i-restart"/></svg>Restart</button><button class="btn" id="pMap"><svg><use href="#i-map"/></svg>Level map</button><button class="btn" id="pHelp"><svg><use href="#i-help"/></svg>How to play</button><button class="btn" id="pSound"><svg><use href="#i-sound"/></svg>Sound ' + (prog.sound ? 'on' : 'off') + '</button></div>',
      () => { on('pResume', closeModal); on('pRestart', restart); on('pMap', () => { mapSel = G.idx; mapWorld = G.def.world; show('map'); }); on('pHelp', help); on('pSound', () => { prog.sound = !prog.sound; persist(); applySettings(); pause(); }); });
  }
  function help() {
    const back = screen === 'game' ? '<button class="btn gold big" id="hOk">Back to the level</button>' : '<button class="btn gold big" id="hOk">Got it</button>';
    openModal('<h2>How to play</h2>' +
      '<p>Reach the portal. Every move you make is recorded, and each <b style="color:var(--gold)">echo</b> groups your moves into batches. When a batch is full, the echo copies <b>only its first move</b>. The rest are thrown away.</p>' +
      '<div class="help-demo card"><div class="ecard-top"><div class="glyph trace" style="--g:40px"><span>E</span></div><div><b style="color:var(--gold)">Echo · groups of 4</b><small>You move ↑ → ↓ ←. Echo takes one step ↑.</small></div></div>' +
      '<div class="tape"><div class="slot filled head">' + ARROW('UP') + '</div><div class="slot filled">' + ARROW('RIGHT') + '</div><div class="slot filled">' + ARROW('DOWN') + '</div><div class="slot filled">' + ARROW('LEFT') + '</div></div></div>' +
      '<ul class="help-list"><li>Moves into walls are not recorded. A blocked echo still uses up its batch, so walls let it wait.</li>' +
      '<li>Plates hold doors open while something stands on them. Crates can be pushed but never pulled.</li>' +
      '<li><b>Escape together</b>: required echoes must also reach the portal.</li>' +
      '<li>Coins fill Luck. At 100, Favour makes echoes act every 2 moves for a while.</li>' +
      '<li><b style="color:var(--mint)">Clover</b> is luck you keep between levels: echo steps fill it, bumping echoes into walls drains it. When it is full, use a free Favour in any level.</li>' +
      '<li>Stuck? The game checks every possible line and tells you when a level can no longer be won.</li></ul>' +
      '<p class="keys"><kbd>←↑↓→</kbd>/<kbd>WASD</kbd> or swipe · <kbd>Z</kbd> undo · <kbd>R</kbd> restart · <kbd>F</kbd> favour · <kbd>H</kbd> hop · <kbd>O</kbd> oracle · <kbd>Esc</kbd> pause</p>' +
      '<div class="row">' + back + '</div>', () => on('hOk', () => { prog.introDone = true; persist(); closeModal(); }));
  }
  function settings(confirmReset) {
    openModal('<h2>Settings</h2>' +
      '<div class="setting">Sound effects<button class="toggle" role="switch" id="sSound" aria-checked="' + !!prog.sound + '" aria-label="Sound effects"></button></div>' +
      '<div class="setting">Ambient auras<button class="toggle" role="switch" id="sAmb" aria-checked="' + (prog.ambient !== false) + '" aria-label="Ambient auras"></button></div>' +
      '<div class="setting">Reduce motion<button class="toggle" role="switch" id="sMotion" aria-checked="' + !!prog.reduceMotion + '" aria-label="Reduce motion"></button></div>' +
      '<div class="setting">Progress<button class="btn" id="sReset" style="min-height:42px' + (confirmReset ? ';background:var(--pink);color:#2a0010' : '') + '">' + (confirmReset ? 'Tap again to erase' : 'Reset progress') + '</button></div>' +
      '<div class="row"><button class="btn gold big" id="sOk">Done</button></div>', () => {
      on('sSound', () => { prog.sound = !prog.sound; persist(); applySettings(); settings(); });
      on('sAmb', () => { prog.ambient = prog.ambient === false; persist(); applySettings(); settings(); });
      on('sMotion', () => { prog.reduceMotion = !prog.reduceMotion; persist(); applySettings(); settings(); });
      on('sReset', () => { if (!confirmReset) return settings(true); prog = R.init(P.defaults()); prog.introDone = true; persist(); applySettings(); mapSel = null; closeModal(); show('title'); toast('Progress erased.'); });
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
    if (reveal) {
      if (k === 'Escape') reveal.close();
      else if ((k === ' ' || k === 'Enter') && $('#rvChest') && !$('#rvNext') && !$('#rvDone')) { ev.preventDefault(); reveal.tap(); }
      return;
    }
    if (!$('#overlay').hidden) {
      if (k === 'Escape') { closeModal(); if (screen === 'game' && G && G.S.status !== 'play') { /* stay on result */ } }
      else if ((k === 'n' || k === 'Enter') && $('#vNext')) { ev.preventDefault(); startLevel(G.idx + 1); }
      else if (k === 'Enter' && $('#lcGo')) { ev.preventDefault(); closeModal(); renderPanel(); }
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
    else if (k === 'Escape') { if (G.hop) { G.hop = false; render(); } else pause(); }
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
  $('#planBtn').onclick = () => { if (G) { SFX.click(); planSheet(); } };
  $('#mapPrev').onclick = () => switchWorld(-1); $('#mapNext').onclick = () => switchWorld(1);
  $('#stuckUndo').onclick = undo; $('#stuckRestart').onclick = restart;
  $('#tContinue').onclick = () => { SFX.click(); startLevel(P.nextLevelIndex(prog, LEVELS)); };
  $('#tDaily').onclick = playDaily;
  $('#btnMoves').onclick = boostMoves; $('#btnLuck').onclick = boostLuck; $('#btnSkip').onclick = boostSkip; $('#cloverMeter').onclick = () => { SFX.click(); cloverInfo(); }; $('#tClover').onclick = () => { SFX.click(); cloverInfo(); };
  $('#cloverBanner').onclick = () => favour();
  $$('[data-go]').forEach((b) => (b.onclick = () => { SFX.click(); if (b.dataset.go === 'map') { mapSel = null; mapWorld = null; } show(b.dataset.go); }));
  $$('[data-open]').forEach((b) => (b.onclick = () => { SFX.click(); b.dataset.open === 'help' ? help() : settings(); }));
  $('#overlay').addEventListener('click', (e) => { if (e.target === $('#overlay') && G && G.S.status === 'play' && screen === 'game') closeModal(); });
  let rt = 0;
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    // phones fire resize when the address bar shows/hides; only a width change needs a re-layout there
    if (window.innerWidth <= 980 && window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(rt); rt = setTimeout(() => { if (screen === 'game' && fit()) render(true); }, 120);
  });

  // boot
  Amb.init();
  applySettings();
  show('title');
  if (!prog.introDone) help();
  // test hook for automated play-throughs
  window.__am = { state: () => G && G.S, level: () => G && G.L, start: startLevel, show };
})();
