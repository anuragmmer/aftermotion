/* Aftermotion simulation engine (spec v0.1).
 * Pure and deterministic: no DOM, no wall clock, no RNG. The UI and the
 * Oracle preview both call the same step() transition.
 * Timers are counted in accepted player actions (declared unit). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DIR_NAMES = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
  const DELTA = { UP: [0, -1], RIGHT: [1, 0], DOWN: [0, 1], LEFT: [-1, 0] };
  const ARROW = { UP: '↑', RIGHT: '→', DOWN: '↓', LEFT: '←' };

  const CONFIG = {
    coinLuck: 20, fragLuck: 40, favourCost: 100,
    favourDuration: 10, favourReduction: 2, bmin: 1,
    cooldown: 6, cooldownPenalty: 1, cooldownCap: 4,
    tempBlockTtl: 8, corruptionTtl: 6,
    helperLifetime: 8, helperHold: 6, helperRange: 6,
    hopRange: 3, hopHold: 4,
    enemyDelay: 2, enemyTelegraph: 2, enemyRecover: 3, enemyRange: 6,
    weights: { route: 3, mech: 1, sep: 2, dist: 1, risk: 1 },
  };

  const ARCHETYPES = {
    trace:   { name: 'Trace',   glyph: 'T', B: 4, role: 'Reliable baseline. Walks its batch-head direction.' },
    flicker: { name: 'Flicker', glyph: 'F', B: 2, role: 'Fast cadence. Can hop (H) to a nearby tile.', hop: true },
    mason:   { name: 'Mason',   glyph: 'M', B: 4, role: 'Builds a temporary block on the tile its batch head points at.', charges: 3 },
    keeper:  { name: 'Keeper',  glyph: 'K', B: 3, role: 'Sends a helper to hold the nearest free plate.', charges: 3 },
  };
  const ECHO_CHARS = { T: 'trace', F: 'flicker', M: 'mason', K: 'keeper' };

  const key = (x, y) => x + ',' + y;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  /* ---------- level loading ---------- */
  function loadLevel(def) {
    const h = def.map.length, w = def.map[0].length;
    const level = {
      id: def.id, name: def.name, intro: def.intro, mode: def.mode || 'through',
      maxMoves: def.maxMoves || null, par: def.par || null,
      w, h, tiles: [], plates: {}, doors: {}, plateLetters: [], exit: null,
      exitLock: def.exitLock || [], required: def.required || [], overrides: def.overrides || {},
      luck0: def.luck0 || 0, def,
    };
    const st = {
      tick: 0, moves: 0, player: null, history: [], echoes: [], blocks: [], coins: [],
      luck: level.luck0, open: {}, plateActive: {}, helpers: [], enemy: null,
      status: 'play', reason: '', nextId: 1, stats: { blocked: 0, hops: 0, favours: 0 },
    };
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        const c = def.map[y][x];
        let t = '.';
        if (c === '#') t = '#';
        else if (c === 'X') { t = '.'; level.exit = { x, y }; }
        else if (c === 'P') { st.player = { x, y }; level.start = { x, y }; }
        else if (c === 'o') st.blocks.push({ x, y, kind: 'push', ttl: 0 });
        else if (c === 'c') st.coins.push({ x, y, v: CONFIG.coinLuck });
        else if (c === '*') st.coins.push({ x, y, v: CONFIG.fragLuck, rare: true });
        else if (c >= 'a' && c <= 'd') {
          level.plates[key(x, y)] = c.toUpperCase();
          if (!level.plateLetters.includes(c.toUpperCase())) level.plateLetters.push(c.toUpperCase());
        } else if (c >= 'A' && c <= 'D') {
          level.doors[key(x, y)] = c;
          st.open[c] = false;
        } else if (c === 'Z') st.enemy = { x, y, state: 'IDLE', t: CONFIG.enemyDelay, target: null };
        else if (ECHO_CHARS[c]) {
          const a = ARCHETYPES[ECHO_CHARS[c]];
          st.echoes.push({
            id: 0, type: ECHO_CHARS[c], x, y, B: a.B, activeB: a.B, batch: [], counter: 0,
            state: 'NORMAL', favour: 0, cooldown: 0, charges: a.charges || 0,
            hopping: false, hop: a.hop ? { origin: null, hold: 0, charges: 1 } : null,
            required: false,
          });
        }
        row += t;
      }
      level.tiles.push(row);
    }
    st.echoes.forEach((e, i) => {
      e.id = i + 1;
      const o = level.overrides[e.id];
      if (o) Object.assign(e, o);
      e.activeB = e.B;
      e.required = level.required.includes(e.id);
    });
    level.plateLetters.forEach((l) => (st.plateActive[l] = false));
    recompute(level, st);
    return { level, state: st };
  }

  /* ---------- world queries ---------- */
  const inBounds = (L, x, y) => x >= 0 && y >= 0 && x < L.w && y < L.h;
  const isWall = (L, x, y) => !inBounds(L, x, y) || L.tiles[y][x] === '#';
  const doorLetter = (L, x, y) => L.doors[key(x, y)];
  const doorClosed = (L, S, x, y) => { const d = doorLetter(L, x, y); return !!d && !S.open[d]; };
  const blockAt = (S, x, y) => S.blocks.find((b) => b.x === x && b.y === y);
  const isExit = (L, x, y) => L.exit && L.exit.x === x && L.exit.y === y;
  const echoesAt = (S, x, y) => S.echoes.filter((e) => e.x === x && e.y === y);
  const helperAt = (S, x, y) => S.helpers.find((h) => h.x === x && h.y === y);
  const actorAt = (S, x, y) =>
    (S.player.x === x && S.player.y === y) || echoesAt(S, x, y).length > 0 || !!helperAt(S, x, y);
  const baseOpen = (L, S, x, y) => !isWall(L, x, y) && !doorClosed(L, S, x, y);

  function plateOccupied(S, x, y) {
    return actorAt(S, x, y) || !!blockAt(S, x, y);
  }

  /* Plates (pressure): active while any accepted occupant stands on one tile of that letter.
     Doors follow plate state but never close through an occupant. */
  function recompute(L, S) {
    L.plateLetters.forEach((l) => (S.plateActive[l] = false));
    for (const k of Object.keys(L.plates)) {
      const [x, y] = k.split(',').map(Number);
      if (plateOccupied(S, x, y)) S.plateActive[L.plates[k]] = true;
    }
    for (const l of Object.keys(S.open)) {
      if (S.plateActive[l]) { S.open[l] = true; continue; }
      if (!S.open[l]) continue;
      let occupied = false;
      for (const k of Object.keys(L.doors)) {
        if (L.doors[k] !== l) continue;
        const [x, y] = k.split(',').map(Number);
        if (actorAt(S, x, y)) occupied = true;
      }
      if (!occupied) S.open[l] = false;
    }
  }

  const exitReady = (L, S) => L.exitLock.every((l) => S.plateActive[l]);

  function bfs(L, S, from, to, passable) {
    const q = [from], prev = { [key(from.x, from.y)]: null };
    for (let i = 0; i < q.length; i++) {
      const c = q[i];
      if (c.x === to.x && c.y === to.y) {
        const path = [];
        for (let k = key(c.x, c.y); k; k = prev[k] && key(prev[k].x, prev[k].y)) {
          const [x, y] = k.split(',').map(Number);
          path.unshift({ x, y });
        }
        return path;
      }
      for (const d of DIR_NAMES) {
        const nx = c.x + DELTA[d][0], ny = c.y + DELTA[d][1], k = key(nx, ny);
        if (k in prev || !inBounds(L, nx, ny) || !passable(nx, ny)) continue;
        prev[k] = c;
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  /* ---------- moves ---------- */
  function playerMove(L, S, dir, ev) {
    const tx = S.player.x + DELTA[dir][0], ty = S.player.y + DELTA[dir][1];
    if (isWall(L, tx, ty)) return fail('wall');
    if (doorClosed(L, S, tx, ty)) return fail('closed door');
    const b = blockAt(S, tx, ty);
    if (b) {
      if (b.kind !== 'push') return fail(b.kind === 'temp' ? 'echo block' : 'corruption block');
      const bx = tx + DELTA[dir][0], by = ty + DELTA[dir][1];
      const bad =
        isWall(L, bx, by) || blockAt(S, bx, by) || doorLetter(L, bx, by) || isExit(L, bx, by) ||
        S.echoes.some((e) => e.x === bx && e.y === by) || helperAt(S, bx, by);
      if (bad) return fail('block cannot be pushed there');
      b.x = bx; b.y = by;
      ev.push({ type: 'PUSH', text: 'You push the block ' + dir + '.' });
    }
    S.player.x = tx; S.player.y = ty;
    return true;
    function fail(reason) {
      ev.push({ type: 'BLOCKED', text: 'Blocked (' + reason + '). Not recorded.' });
      return false;
    }
  }

  function batchSize(e) {
    if (e.state === 'FAVOURED') return Math.max(CONFIG.bmin, e.B - CONFIG.favourReduction);
    if (e.state === 'COOLDOWN') return Math.min(Math.max(e.B, CONFIG.cooldownCap), e.B + CONFIG.cooldownPenalty);
    return e.B;
  }

  const ename = (e) => ARCHETYPES[e.type].name;

  function echoAct(L, S, e, dir, ev) {
    const tx = e.x + DELTA[dir][0], ty = e.y + DELTA[dir][1];
    if (e.type === 'mason') {
      const why = placementError(L, S, tx, ty);
      if (e.charges <= 0) ev.push({ type: 'ECHO_BLOCKED', echo: e.id, text: 'Mason has no charges left.' });
      else if (why) ev.push({ type: 'ECHO_BLOCKED', echo: e.id, text: 'Mason cannot build ' + dir + ' (' + why + '). No charge used.' });
      else {
        e.charges--;
        S.blocks.push({ x: tx, y: ty, kind: 'temp', ttl: CONFIG.tempBlockTtl, owner: e.id });
        ev.push({ type: 'BUILD', echo: e.id, text: 'Mason builds a temporary block ' + dir + '.' });
      }
      return;
    }
    if (e.type === 'keeper') {
      if (S.helpers.some((h) => h.owner === e.id)) { ev.push({ type: 'ECHO_BLOCKED', echo: e.id, text: 'Keeper already has a helper out.' }); return; }
      if (e.charges <= 0) { ev.push({ type: 'ECHO_BLOCKED', echo: e.id, text: 'Keeper has no charges left.' }); return; }
      let best = null;
      for (const k of Object.keys(L.plates)) {
        const [px, py] = k.split(',').map(Number);
        if (plateOccupied(S, px, py) || S.helpers.some((h) => h.target.x === px && h.target.y === py)) continue;
        const path = bfs(L, S, { x: e.x, y: e.y }, { x: px, y: py }, (x, y) => baseOpen(L, S, x, y) && !blockAt(S, x, y));
        if (!path || path.length - 1 > CONFIG.helperRange) continue;
        const d = path.length - 1;
        if (!best || d < best.d || (d === best.d && (py < best.y || (py === best.y && px < best.x)))) best = { x: px, y: py, d };
      }
      if (!best) { ev.push({ type: 'NO_TARGET', echo: e.id, text: 'Keeper finds no reachable free plate. No charge used.' }); return; }
      e.charges--;
      S.helpers.push({ id: S.nextId++, owner: e.id, x: e.x, y: e.y, state: 'SEEK', target: { x: best.x, y: best.y }, life: CONFIG.helperLifetime, hold: 0, fresh: true });
      ev.push({ type: 'HELPER', echo: e.id, text: 'Keeper sends a helper to the plate at (' + best.x + ',' + best.y + ').' });
      return;
    }
    // Trace / Flicker: move; a blocked move still consumes the batch.
    let reason = null;
    if (isWall(L, tx, ty)) reason = 'wall';
    else if (doorClosed(L, S, tx, ty)) reason = 'closed door';
    else if (blockAt(S, tx, ty)) reason = 'block';
    if (reason) { ev.push({ type: 'ECHO_BLOCKED', echo: e.id, text: ename(e) + ' tries ' + dir + ': blocked by ' + reason + '.' }); S.stats.blocked++; }
    else { e.x = tx; e.y = ty; ev.push({ type: 'ECHO_MOVED', echo: e.id, text: ename(e) + ' moves ' + dir + '.' }); }
  }

  function placementError(L, S, x, y) {
    if (isWall(L, x, y)) return 'wall';
    if (doorLetter(L, x, y)) return 'door tile';
    if (isExit(L, x, y)) return 'exit';
    if (blockAt(S, x, y)) return 'occupied by block';
    if (actorAt(S, x, y)) return 'occupied by actor';
    if (S.coins.some((c) => c.x === x && c.y === y)) return 'collectible';
    return null;
  }

  /* ---------- hostile Blocker ---------- */
  function enemyCandidates(L, S) {
    const en = S.enemy, out = [];
    const open = (x, y) => !isWall(L, x, y) && !doorLetter(L, x, y);
    const pathP = bfs(L, S, S.player, L.exit, (x, y) => open(x, y)) || [];
    const route = new Set(pathP.map((p) => key(p.x, p.y)));
    const req = S.echoes.find((e) => e.required);
    const pathE = req ? bfs(L, S, { x: req.x, y: req.y }, L.exit, (x, y) => open(x, y)) || [] : [];
    const sep = new Set(pathE.map((p) => key(p.x, p.y)));
    const W = CONFIG.weights;
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.tiles[y][x] !== '.' || L.plates[key(x, y)] || doorLetter(L, x, y) || isExit(L, x, y)) continue;
      if (L.start.x === x && L.start.y === y) continue; // protected spawn
      if (placementError(L, S, x, y)) continue;
      if (Math.abs(en.x - x) + Math.abs(en.y - y) > CONFIG.enemyRange) continue;
      let mech = 0, walls = 0;
      for (const d of DIR_NAMES) {
        const nx = x + DELTA[d][0], ny = y + DELTA[d][1];
        if (L.plates[key(nx, ny)] || doorLetter(L, nx, ny)) mech = 1;
        if (isWall(L, nx, ny)) walls++;
      }
      const rc = route.has(key(x, y)) ? 1 : 0, sp = sep.has(key(x, y)) ? 1 : 0;
      const score = W.route * rc + W.mech * mech + W.sep * sp
        - W.dist * ((Math.abs(en.x - x) + Math.abs(en.y - y)) / (L.w + L.h)) - W.risk * (walls >= 3 ? 1 : 0);
      if (rc + mech + sp === 0) continue;
      out.push({ x, y, score });
    }
    out.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
    return out;
  }

  function enemyTick(L, S, ev) {
    const en = S.enemy;
    if (!en) return;
    if (en.state === 'TELEGRAPH') {
      en.t--;
      if (en.t <= 0) {
        const t = en.target;
        if (!placementError(L, S, t.x, t.y)) {
          S.blocks.push({ x: t.x, y: t.y, kind: 'corr', ttl: CONFIG.corruptionTtl, owner: 0 });
          ev.push({ type: 'ENEMY', text: 'Blocker places a corruption block at (' + t.x + ',' + t.y + ').' });
        } else ev.push({ type: 'ENEMY', text: 'Blocker\'s target became invalid. Placement cancelled.' });
        en.state = 'RECOVER'; en.t = CONFIG.enemyRecover; en.target = null;
      }
    } else if (en.state === 'RECOVER') {
      if (--en.t <= 0) { en.state = 'IDLE'; en.t = 1; }
    } else if (--en.t <= 0) {
      const c = enemyCandidates(L, S);
      if (c.length) {
        en.state = 'TELEGRAPH'; en.t = CONFIG.enemyTelegraph; en.target = { x: c[0].x, y: c[0].y };
        ev.push({ type: 'ENEMY', text: 'Blocker is targeting (' + c[0].x + ',' + c[0].y + ') — resolves in ' + CONFIG.enemyTelegraph + ' moves.' });
      } else en.t = 1;
    }
  }

  /* ---------- the step: deterministic resolution order (spec 14) ---------- */
  function step(L, S0, dir) {
    const S = clone(S0), ev = [];
    if (S.status !== 'play') return { state: S, accepted: false, events: ev };
    // 1-2: validate/apply player movement, record history
    if (!playerMove(L, S, dir, ev)) { S.stats.blocked++; return { state: S, accepted: false, events: ev }; }
    S.history.push(dir);
    S.moves++; S.tick++;
    // 3: echoes accumulate batches; due actions resolve in stable id order
    for (const e of S.echoes) {
      if (e.hopping) continue; // batch state preserved while hopping
      if (e.counter === 0) e.activeB = batchSize(e); // cadence sampled at batch start
      e.batch.push(dir); e.counter++;
      if (e.counter >= e.activeB) {
        const sel = e.batch[0];
        e.batch = []; e.counter = 0;
        echoAct(L, S, e, sel, ev);
      }
    }
    // 4: hop timers / returns
    for (const e of S.echoes) {
      if (!e.hopping) continue;
      if (--e.hop.hold <= 0) {
        const o = e.hop.origin;
        if (baseOpen(L, S, o.x, o.y) && !blockAt(S, o.x, o.y)) { e.x = o.x; e.y = o.y; ev.push({ type: 'HOP', echo: e.id, text: ename(e) + ' returns from its hop.' }); }
        else ev.push({ type: 'HOP', echo: e.id, text: ename(e) + ' cannot return (origin blocked) and stays at the hop target.' });
        e.hopping = false; e.hop.origin = null;
      }
    }
    // 5: helpers
    for (const h of S.helpers) {
      if (h.fresh) { h.fresh = false; continue; }
      if (h.state === 'SEEK') {
        if (--h.life < 0) { h.state = 'EXPIRED'; ev.push({ type: 'HELPER', echo: h.owner, text: 'Helper missed its arrival window and expired.' }); continue; }
        const path = bfs(L, S, { x: h.x, y: h.y }, h.target, (x, y) => baseOpen(L, S, x, y) && !blockAt(S, x, y));
        if (!path) { h.state = 'EXPIRED'; ev.push({ type: 'HELPER', echo: h.owner, text: 'Helper lost its path and expired.' }); continue; }
        if (path.length > 1) { h.x = path[1].x; h.y = path[1].y; }
        if (h.x === h.target.x && h.y === h.target.y) { h.state = 'PERFORM'; h.hold = CONFIG.helperHold; ev.push({ type: 'HELPER', echo: h.owner, text: 'Helper reached the plate and holds it.' }); }
      } else if (h.state === 'PERFORM') {
        if (--h.hold <= 0) { h.state = 'EXPIRED'; ev.push({ type: 'HELPER', echo: h.owner, text: 'Helper finished and vanished.' }); }
      }
    }
    S.helpers = S.helpers.filter((h) => h.state !== 'EXPIRED');
    // 6: collisions / pickups
    const ci = S.coins.findIndex((c) => c.x === S.player.x && c.y === S.player.y);
    if (ci >= 0) {
      const c = S.coins.splice(ci, 1)[0];
      S.luck = Math.min(100, Math.max(0, S.luck + c.v));
      ev.push({ type: 'LUCK', text: (c.rare ? 'Fragment' : 'Coin') + ' collected: Luck +' + c.v + '.' });
    }
    // 7: plates & doors
    recompute(L, S);
    // 8: (timed plates/doors: none in MVP; doors use occupancy-safe closing in recompute)
    // 9: hostile actions with expired telegraphs
    enemyTick(L, S, ev);
    // 10: temporary object expiry (never embed an actor)
    for (const b of S.blocks) if (b.ttl > 0) b.ttl--;
    S.blocks = S.blocks.filter((b) => {
      if (b.kind === 'push' || b.ttl > 0) return true;
      if (actorAt(S, b.x, b.y)) { b.ttl = 1; return true; }
      ev.push({ type: 'EXPIRE', text: (b.kind === 'temp' ? 'A temporary block' : 'A corruption block') + ' at (' + b.x + ',' + b.y + ') expires.' });
      return false;
    });
    recompute(L, S);
    // 11: favour / cooldown timers
    for (const e of S.echoes) {
      if (e.state === 'FAVOURED' && --e.favour <= 0) { e.state = 'COOLDOWN'; e.cooldown = CONFIG.cooldown; ev.push({ type: 'FAVOUR', echo: e.id, text: ename(e) + '\'s favour ends: cooldown.' }); }
      else if (e.state === 'COOLDOWN' && --e.cooldown <= 0) { e.state = 'NORMAL'; ev.push({ type: 'FAVOUR', echo: e.id, text: ename(e) + ' recovers.' }); }
    }
    // 12: win / failure
    evaluate(L, S, ev);
    return { state: S, accepted: true, events: ev };
  }

  function evaluate(L, S, ev) {
    const atExit = isExit(L, S.player.x, S.player.y);
    let won = atExit && exitReady(L, S);
    if (won && L.mode === 'together') won = S.echoes.filter((e) => e.required).every((e) => !e.hopping && isExit(L, e.x, e.y));
    if (won) { S.status = 'won'; ev.push({ type: 'WIN', text: 'Level complete!' }); return; }
    if (L.maxMoves && S.moves >= L.maxMoves) { S.status = 'lost'; S.reason = 'Out of moves (timer expired).'; ev.push({ type: 'LOSE', text: S.reason }); }
  }

  /* ---------- commands ---------- */
  function favourReady(S) {
    return S.status === 'play' && S.luck >= CONFIG.favourCost &&
      S.echoes.some((e) => e.state === 'NORMAL');
  }
  function activateFavour(L, S0) {
    if (!favourReady(S0)) return { ok: false, state: S0, events: [{ type: 'INFO', text: S0.luck < CONFIG.favourCost ? 'Luck meter is not full.' : 'No echo can accept favour right now.' }] };
    const S = clone(S0);
    S.luck -= CONFIG.favourCost;
    S.stats.favours++;
    for (const e of S.echoes) if (e.state === 'NORMAL') { e.state = 'FAVOURED'; e.favour = CONFIG.favourDuration; }
    return { ok: true, state: S, events: [{ type: 'FAVOUR', text: 'Favour! Echoes use faster cadence from their next batch.' }] };
  }

  function hopError(L, S, e, x, y) {
    if (!e || !e.hop) return 'This echo cannot hop.';
    if (e.hopping || e.state === 'COOLDOWN') return 'Echo cannot hop right now.';
    if (e.hop.charges <= 0) return 'No hop charges.';
    if (manhattan(e, { x, y }) > CONFIG.hopRange) return 'Target out of range (' + CONFIG.hopRange + ').';
    if (manhattan(e, { x, y }) === 0) return 'Already there.';
    if (isWall(L, x, y) || doorClosed(L, S, x, y)) return 'Target not legal.';
    if (isExit(L, x, y)) return 'Cannot hop onto the exit.';
    if (blockAt(S, x, y)) return 'Target occupied by a block.';
    return null;
  }
  function hop(L, S0, echoId, x, y) {
    const e0 = S0.echoes.find((e) => e.id === echoId), why = hopError(L, S0, e0, x, y);
    if (why) return { ok: false, state: S0, events: [{ type: 'INFO', text: 'Hop refused: ' + why }] };
    const S = clone(S0), e = S.echoes.find((q) => q.id === echoId);
    e.hop.origin = { x: e.x, y: e.y }; e.hop.hold = CONFIG.hopHold; e.hop.charges--;
    e.hopping = true; e.x = x; e.y = y;
    S.stats.hops++;
    recompute(L, S);
    const ev = [{ type: 'HOP', echo: e.id, text: ename(e) + ' hops to (' + x + ',' + y + ') for ' + CONFIG.hopHold + ' moves.' }];
    evaluate(L, S, ev);
    return { ok: true, state: S, events: ev };
  }

  /* Oracle: run the same step() on a snapshot for each legal direction. */
  function oracle(L, S) {
    return DIR_NAMES.map((d) => {
      const r = step(L, S, d);
      const notes = r.events.filter((q) => q.type !== 'PUSH' && q.type !== 'BLOCKED').map((q) => q.text);
      return { dir: d, accepted: r.accepted, notes, status: r.state.status };
    });
  }

  return {
    CONFIG, ARCHETYPES, DIR_NAMES, DELTA, ARROW, loadLevel, step, activateFavour, favourReady,
    hop, hopError, oracle, batchSize, enemyCandidates, isExit, isWall, doorLetter, blockAt, exitReady,
    key, clone, placementError,
  };
});
