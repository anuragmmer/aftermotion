/* Aftermotion coin sources outside the campaign (see docs/Rewards_Economy_Design.md):
 *  - Echo Quiz: five daily "where will the echo end up?" puzzles, generated and solved by the real engine
 *  - Echo Garden: everything you own lives in a garden that earns coins while you are away
 *  - Login calendar: a 7-day cycle of gifts that never resets if you miss a day
 * Pure rules over the save data, testable in node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'), require('./shop.js'), require('./rewards.js'));
  else root.AMExtras = factory(root.AM, root.AMShop, root.AMRewards);
})(typeof self !== 'undefined' ? self : this, function (AM, Shop, R) {
  'use strict';
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngOf(seed) { let x = seed >>> 0 || 1; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }
  const DIRS = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

  /* ---------- Echo Quiz ---------- */
  const QUIZ = { perDay: 5, pay: [20, 30, 45, 60, 80], perfect: 100, perfectChest: 'bronze' };
  // difficulty per question: room size, inner walls, echo kind, number of your moves
  const QLEVEL = [
    { w: 6, h: 5, walls: 0, kind: 'T', moves: 4 },
    { w: 7, h: 5, walls: 2, kind: 'T', moves: 8 },
    { w: 7, h: 6, walls: 3, kind: 'F', moves: 6 },
    { w: 7, h: 6, walls: 4, kind: 'T', moves: 12 },
    { w: 8, h: 6, walls: 5, kind: 'F', moves: 10 },
  ];
  /* Builds question k of a day. The answer comes from replaying the moves through the engine, so it
     is always exactly what the game would do. Wrong options are the classic misreadings: the echo
     copying every move, copying the last move of each group, or not moving at all. */
  function quizQuestion(day, k) {
    const Q = QLEVEL[Math.min(k, QLEVEL.length - 1)];
    for (let attempt = 0; attempt < 60; attempt++) {
      const rnd = rngOf(hash(day + ':quiz:' + k + ':' + attempt)), W = Q.w + 2, H = Q.h + 2;
      const grid = []; for (let y = 0; y < H; y++) grid.push(Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '#' : '.')));
      const free = () => { for (;;) { const x = 1 + Math.floor(rnd() * Q.w), y = 1 + Math.floor(rnd() * Q.h); if (grid[y][x] === '.') return { x, y }; } };
      for (let i = 0; i < Q.walls; i++) { const c = free(); grid[c.y][c.x] = '#'; }
      const p = free(); grid[p.y][p.x] = 'P';
      const e = free(); grid[e.y][e.x] = Q.kind;
      const xx = free(); grid[xx.y][xx.x] = 'X';
      const map = grid.map((r) => r.join(''));
      const r0 = AM.loadLevel({ id: 0, name: 'quiz', map, mode: 'through' });
      let L = r0.level, S = r0.state;
      const moves = [], trace = [{ x: S.echoes[0].x, y: S.echoes[0].y }], ptrace = [{ x: S.player.x, y: S.player.y }];
      let tries = 0;
      while (moves.length < Q.moves && tries++ < 300) {
        const d = DIRS[Math.floor(rnd() * 4)], r = AM.step(L, S, d);
        if (!r.accepted || r.state.status !== 'play') continue;
        S = r.state; moves.push(d); trace.push({ x: S.echoes[0].x, y: S.echoes[0].y }); ptrace.push({ x: S.player.x, y: S.player.y });
      }
      if (moves.length < Q.moves) continue;
      const ans = trace[trace.length - 1], start = trace[0];
      const wall = (x, y) => map[y][x] === '#';
      const walk = (pos, dirs) => dirs.reduce((p0, d) => { const dl = AM.DELTA[d], nx = p0.x + dl[0], ny = p0.y + dl[1]; return wall(nx, ny) ? p0 : { x: nx, y: ny }; }, pos);
      const B = S.echoes[0].B, groups = [];
      for (let i = 0; i + B <= moves.length; i += B) groups.push(moves.slice(i, i + B));
      const cands = [walk(start, moves), walk(start, groups.map((g) => g[g.length - 1])), start];
      DIRS.forEach((d) => cands.push(walk(ans, [d])));
      const same = (a, b) => a.x === b.x && a.y === b.y;
      const opts = [ans];
      for (const c of cands) if (!opts.some((o) => same(o, c)) && map[c.y][c.x] !== '#' && opts.length < 4) opts.push(c);
      if (opts.length < 4) continue;
      // the answer should not be trivially "it never moved"
      if (same(ans, start)) continue;
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
      // what happened to each complete group: the echo tried its first move and either stepped or hit a wall
      const outcome = groups.map((g, gi) => { const a = trace[gi * B + B - 1], b = trace[gi * B + B]; return { moves: g, head: g[0], stepped: !same(a, b) }; });
      // the board shows no portal: it plays no part in the question
      const shown = map.map((row) => row.replace('X', '.'));
      return { k, map: shown, moves, kind: Q.kind, B, trace, ptrace, options: opts, answer: opts.findIndex((o) => same(o, ans)), heads: groups.map((g) => g[0]), groups: outcome };
    }
    return null;
  }
  function quizState(prog, day) {
    if (!prog.quiz || prog.quiz.day !== day) prog.quiz = { day, k: 0, right: 0, done: false, hist: [] };
    return prog.quiz;
  }
  /* Answer the current question; pays on a correct answer, plus a bonus for a perfect day. */
  function quizAnswer(prog, day, choice) {
    const st = quizState(prog, day);
    if (st.done) return null;
    const q = quizQuestion(day, st.k), ok = choice === q.answer, out = { ok, coins: 0, perfect: false, q };
    if (ok) { st.right++; out.coins = R.earn(prog, QUIZ.pay[st.k]); }
    st.hist.push(ok); st.k++;
    if (st.k >= QUIZ.perDay) {
      st.done = true;
      if (st.right === QUIZ.perDay) { out.perfect = true; out.coins += R.earn(prog, QUIZ.perfect); R.grantChest(prog, QUIZ.perfectChest, 'Perfect Echo Quiz'); }
    }
    prog.stats.quiz = (prog.stats.quiz || 0) + (ok ? 1 : 0);
    return out;
  }

  /* ---------- Echo Garden: your collection earns coins while you are away ---------- */
  const GARDEN = { base: 4, rate: { common: 0.5, rare: 1, epic: 2.5, legendary: 12 }, faceMul: 1.5, capHours: 10 };
  function gardenRate(prog, levels) {
    let r = GARDEN.base;
    for (const it of Shop.CATALOG) {
      if (it.slot === 'boost' || it.default || !Shop.owns(prog, levels, it)) continue;
      r += (GARDEN.rate[it.rarity] || 0.5) * (it.slot === 'face' ? GARDEN.faceMul : 1);
    }
    return Math.round(r * 10) / 10;
  }
  function gardenState(prog, levels, now) {
    if (!prog.garden) prog.garden = { last: now };
    const rate = gardenRate(prog, levels), hours = Math.min(GARDEN.capHours, Math.max(0, (now - prog.garden.last) / 3600000));
    return { rate, hours, stored: Math.floor(rate * hours), cap: Math.floor(rate * GARDEN.capHours), full: hours >= GARDEN.capHours, fullIn: (GARDEN.capHours - hours) * 3600000 };
  }
  function gardenCollect(prog, levels, now) {
    const st = gardenState(prog, levels, now);
    if (st.stored < 1) return 0;
    prog.garden.last = now;
    prog.stats.garden = (prog.stats.garden || 0) + st.stored;
    return R.earn(prog, st.stored);
  }

  /* ---------- 7-day login calendar ---------- */
  const CALENDAR = [{ coins: 50 }, { coins: 80 }, { boost: 'hint', n: 2 }, { coins: 120 }, { chest: 'silver' }, { coins: 200 }, { chest: 'gold' }];
  function calendarState(prog, day) {
    const c = prog.login || { last: '', step: 0 };
    return { step: c.step % CALENDAR.length, ready: c.last !== day, cycle: Math.floor(c.step / CALENDAR.length) };
  }
  function calendarClaim(prog, day) {
    const st = calendarState(prog, day);
    if (!st.ready) return null;
    const g = CALENDAR[st.step];
    if (g.coins) R.earn(prog, g.coins);
    if (g.boost) prog.inv[g.boost] += g.n;
    if (g.chest) R.grantChest(prog, g.chest, 'Day ' + (st.step + 1) + ' gift');
    prog.login = { last: day, step: ((prog.login && prog.login.step) || 0) + 1 };
    return { day: st.step + 1, gift: g };
  }

  return { QUIZ, quizQuestion, quizState, quizAnswer, GARDEN, gardenRate, gardenState, gardenCollect, CALENDAR, calendarState, calendarClaim };
});
