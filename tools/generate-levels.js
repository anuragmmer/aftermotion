// Level generator for worlds 7+. Builds rooms from a per-world recipe, proves each candidate with
// the engine's solver, keeps only levels where every taught element is required ("needs"
// ablations, same as tools/check-levels.js), and picks 10 per world in rising difficulty.
// usage: node tools/generate-levels.js <world> [tries] [seed]   -> tools/gen/w<world>.json
//        node tools/generate-levels.js --apply                   -> appends tools/gen/*.json to js/levels.js
const fs = require('fs');
const path = require('path');
const AM = require('../js/engine.js');
const { solve, ABLATE } = require('./check-levels.js');

const GEN = path.join(__dirname, 'gen');
function rngOf(seed) { let x = seed >>> 0 || 1; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }

/* ---------- room building blocks ---------- */
function blank(W, H) { const g = []; for (let y = 0; y < H; y++) g.push(Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '#' : '.'))); return g; }
function cellIn(rng, g, x0, x1, y0, y1) {
  for (let i = 0; i < 200; i++) { const x = x0 + Math.floor(rng() * (x1 - x0 + 1)), y = y0 + Math.floor(rng() * (y1 - y0 + 1)); if (g[y] && g[y][x] === '.') return { x, y }; }
  return null;
}
function put(g, c, ch) { if (!c) throw new Error('no room'); g[c.y][c.x] = ch; return c; }
// a full-height wall at column x with a door letter at a random row
function divider(rng, g, x, door) { const H = g.length; for (let y = 1; y < H - 1; y++) g[y][x] = '#'; const y = 1 + Math.floor(rng() * (H - 2)); g[y][x] = door; return { x, y }; }
function scatter(rng, g, n, x0, x1) { for (let i = 0; i < n; i++) { const c = cellIn(rng, g, x0, x1, 1, g.length - 2); if (c) g[c.y][c.x] = '#'; } }

/* A portal powered by two plates at once: one helper cannot hold both, so the level needs two
   different holders working together (two echoes, an echo and a crate, a helper and a block). */
const HARD = +process.env.HARD || 0, MINPAR = +process.env.MINPAR || 8, CAP = HARD ? 900000 : 400000, MS = HARD ? 12000 : 6000;
function dualLock(rng, holders, extra) {
  const W = 10 + HARD * 2 + Math.floor(rng() * 4), H = 6 + HARD + Math.floor(rng() * 3), g = blank(W, H);
  scatter(rng, g, 3 + HARD * 4 + Math.floor(rng() * 6), 1, W - 2);
  put(g, cellIn(rng, g, Math.floor(W / 2), W - 2, 1, H - 2), 'X');
  put(g, cellIn(rng, g, 1, W - 2, 1, H - 2), 'a');
  put(g, cellIn(rng, g, 1, W - 2, 1, H - 2), 'b');
  put(g, cellIn(rng, g, 1, Math.floor(W / 2), 1, H - 2), 'P');
  holders.forEach((k) => put(g, k === 'o' ? cellIn(rng, g, 2, W - 3, 2, H - 3) : cellIn(rng, g, 1, W - 2, 1, H - 2), k));
  if (extra) extra(g);
  return g;
}
/* ---------- world recipes: return { map, mode, required, needs, ... } ---------- */
const RECIPES = {
  // World 7, Echo Chamber: twin Traces and Flicker together, echoes that must escape with you
  7: (rng) => {
    if (rng() < 0.5) { const kinds = rng() < 0.5 ? ['T', 'T'] : ['T', 'F']; return { map: dualLock(rng, kinds), mode: 'through', required: [], needs: [...new Set(kinds)], core: [...new Set(kinds)], exitLock: ['A', 'B'] }; }
    const W = 9 + Math.floor(rng() * 3), H = 5 + Math.floor(rng() * 2), g = blank(W, H), dx = W - 3 - Math.floor(rng() * 2);
    divider(rng, g, dx, 'A');
    put(g, cellIn(rng, g, dx + 1, W - 2, 1, H - 2), 'X');
    scatter(rng, g, 2 + Math.floor(rng() * 4), 1, dx - 1);
    put(g, cellIn(rng, g, 1, dx - 1, 1, H - 2), 'a');
    put(g, cellIn(rng, g, 1, dx - 1, 1, H - 2), 'P');
    const kinds = rng() < 0.5 ? ['T', 'T'] : ['T', 'F'];
    kinds.forEach((k) => put(g, cellIn(rng, g, 1, dx - 1, 1, H - 2), k));
    const together = rng() < 0.5;
    return { map: g, mode: together ? 'together' : 'through', required: together ? [1] : [], needs: [...new Set(kinds)], core: ['T'] };
  },
  // World 8, Heavy Rhythm: Trace plus crates, two doors in a row
  8: (rng) => {
    if (rng() < 0.4) return { map: dualLock(rng, ['T', 'o']), mode: 'through', required: [], needs: ['T', 'crate'], core: ['T', 'crate'], exitLock: ['A', 'B'] };
    const W = 10 + Math.floor(rng() * 3), H = 6 + Math.floor(rng() * 2), g = blank(W, H);
    const d1 = 4 + Math.floor(rng() * 2), d2 = W - 3;
    divider(rng, g, d1, 'A'); divider(rng, g, d2, 'B');
    put(g, cellIn(rng, g, d2 + 1, W - 2, 1, H - 2), 'X');
    scatter(rng, g, 1 + Math.floor(rng() * 3), 1, d1 - 1); scatter(rng, g, 1 + Math.floor(rng() * 3), d1 + 1, d2 - 1);
    // plate a (first door) must be reachable before any door opens; plate b may sit behind door A
    put(g, cellIn(rng, g, 1, d1 - 1, 1, H - 2), 'a');
    put(g, rng() < 0.5 ? cellIn(rng, g, 1, d1 - 1, 1, H - 2) : cellIn(rng, g, d1 + 1, d2 - 1, 1, H - 2), 'b');
    put(g, cellIn(rng, g, 2, d1 - 2, 2, H - 3), 'o');
    put(g, cellIn(rng, g, 1, d1 - 1, 1, H - 2), 'P');
    put(g, cellIn(rng, g, 1, d1 - 1, 1, H - 2), 'T');
    if (rng() < 0.4) put(g, cellIn(rng, g, d1 + 2, d2 - 1, 2, H - 3), 'o');
    return { map: g, mode: 'through', required: [], needs: ['T', 'crate'] };
  },
  // World 9, Quicksilver: Flicker hops into sealed pockets, coins for Favour, tight move limits
  9: (rng) => {
    if (rng() < (HARD ? 0.75 : 0.5)) {
      // plate a sealed in a pocket only a hop reaches, plate b for a crate (or Trace)
      const other = rng() < 0.6 ? 'o' : 'T';
      const g = dualLock(rng, ['F', other], (g2) => {
        const H2 = g2.length, W2 = g2[0].length, px = 2 + Math.floor(rng() * (W2 - 4)), py = 2 + Math.floor(rng() * (H2 - 4));
        for (let y = py - 1; y <= py + 1; y++) for (let x = px - 1; x <= px + 1; x++) if (!/[PXFTo]/.test(g2[y][x])) g2[y][x] = '#';
        for (let y = 1; y < H2 - 1; y++) for (let x = 1; x < W2 - 1; x++) if (g2[y][x] === 'a' && (x !== px || y !== py)) g2[y][x] = '.';
        g2[py][px] = 'a';
      });
      if (!g.some((r) => r.includes('a'))) return null;
      const needs = other === 'o' ? ['F', 'hop', 'crate'] : ['F', 'hop', 'T'];
      return { map: g, mode: 'through', required: [], needs, core: needs, exitLock: ['A', 'B'] };
    }
    const W = 11 + Math.floor(rng() * 3), H = 6 + Math.floor(rng() * 2), g = blank(W, H), dx = W - 3, crate = rng() < 0.6, d0 = 5 + Math.floor(rng() * 2);
    divider(rng, g, dx, 'A');
    if (crate) divider(rng, g, d0, 'B');
    put(g, cellIn(rng, g, dx + 1, W - 2, 1, H - 2), 'X');
    // a sealed pocket holding the plate: only a hop gets in
    const px = 2 + Math.floor(rng() * (dx - 4)), py = 1 + Math.floor(rng() * 2);
    for (let y = py - 1; y <= py + 1; y++) for (let x = px - 1; x <= px + 1; x++) if (g[y] && g[y][x] !== undefined && y > 0 && y < H - 1 && x > 0) g[y][x] = '#';
    g[py][px] = 'a';
    const near = crate ? d0 - 1 : dx - 1;
    scatter(rng, g, 1 + Math.floor(rng() * 3), 1, dx - 1);
    if (crate) { put(g, cellIn(rng, g, 1, near, 1, H - 2), 'b'); put(g, cellIn(rng, g, 2, near - 1, 2, H - 3), 'o'); }
    put(g, cellIn(rng, g, 1, near, 1, H - 2), 'P');
    put(g, cellIn(rng, g, 1, near, 1, H - 2), 'F');
    const coins = rng() < 0.5;
    if (coins) { put(g, cellIn(rng, g, 1, dx - 1, 1, H - 2), 'c'); put(g, cellIn(rng, g, 1, dx - 1, 1, H - 2), 'c'); }
    return { map: g, mode: 'through', required: [], needs: crate ? ['F', 'hop', 'crate'] : ['F', 'hop'], luck0: coins ? 60 : 0, coins, core: crate ? ['F', 'hop', 'crate'] : ['F', 'hop'] };
  },
  // World 10, Workshop: Mason and Keeper hold plates for each other
  10: (rng) => {
    if (rng() < (HARD ? 0.8 : 0.6)) return { map: dualLock(rng, ['M', 'K']), mode: 'through', required: [], needs: ['M', 'K'], core: ['M', 'K'], exitLock: ['A', 'B'] };
    const W = 11 + Math.floor(rng() * 3), H = 6 + Math.floor(rng() * 2), g = blank(W, H);
    const d1 = 4 + Math.floor(rng() * 3), d2 = W - 3, both = rng() < 0.85;
    divider(rng, g, d2, 'A'); if (both) divider(rng, g, d1, 'B');
    put(g, cellIn(rng, g, d2 + 1, W - 2, 1, H - 2), 'X');
    const left = both ? d1 - 1 : d2 - 1;
    scatter(rng, g, 2 + Math.floor(rng() * 4), 1, left);
    if (both) scatter(rng, g, 1 + Math.floor(rng() * 2), d1 + 1, d2 - 1);
    put(g, cellIn(rng, g, 1, left, 1, H - 2), 'a');
    if (both) put(g, cellIn(rng, g, d1 + 1, d2 - 1, 1, H - 2), 'b');
    put(g, cellIn(rng, g, 1, left, 1, H - 2), 'P');
    const kinds = both ? ['M', 'K'] : [rng() < 0.5 ? 'M' : 'K'];
    kinds.forEach((k) => put(g, cellIn(rng, g, 1, left, 1, H - 2), k));
    return { map: g, mode: 'through', required: [], needs: kinds, core: kinds };
  },
  // World 11, Storm Front: the Blocker interferes while echoes and crates hold the doors
  11: (rng) => {
    if (rng() < (HARD ? 0.85 : 0.5)) {
      const pair = [['T', 'o'], ['M', 'K'], ['F', 'o'], ['T', 'M'], ['F', 'K']][Math.floor(rng() * 5)];
      const needs = pair.map((k) => (k === 'o' ? 'crate' : k));
      return { map: dualLock(rng, pair.concat('Z')), mode: 'through', required: [], needs, core: needs, exitLock: ['A', 'B'], enemy: true };
    }
    const W = 10 + Math.floor(rng() * 3), H = 6 + Math.floor(rng() * 2), g = blank(W, H), dx = W - 3;
    divider(rng, g, dx, 'A');
    put(g, cellIn(rng, g, dx + 1, W - 2, 1, H - 2), 'X');
    scatter(rng, g, 2 + Math.floor(rng() * 4), 1, dx - 1);
    put(g, cellIn(rng, g, 1, dx - 1, 1, H - 2), 'a');
    put(g, cellIn(rng, g, 1, dx - 1, 1, H - 2), 'P');
    const k = ['T', 'F', 'M', 'F', 'M'][Math.floor(rng() * 5)];
    put(g, cellIn(rng, g, 1, dx - 1, 1, H - 2), k);
    put(g, cellIn(rng, g, 1, dx - 1, 1, H - 2), 'Z');
    if (rng() < 0.35) put(g, cellIn(rng, g, 2, dx - 2, 2, H - 3), 'o');
    return { map: g, mode: 'through', required: [], needs: [k], enemy: true };
  },
};

function candidate(world, rng) {
  let r;
  try { r = RECIPES[world](rng); } catch (e) { return null; }
  if (!r) return null;
  // a recipe can overwrite a key tile; skip anything without a player, a portal and the right holders
  const flat = r.map.map((row) => row.join('')).join('');
  if (!flat.includes('P') || !flat.includes('X')) return null;
  const def = { id: 0, name: 'gen', map: r.map.map((row) => row.join('')), mode: r.mode, required: r.required, needs: r.needs };
  if (r.luck0) def.luck0 = r.luck0;
  if (r.exitLock) def.exitLock = r.exitLock;
  if (r.coins) def.needs = def.needs.concat('favour');
  // time-boxed: anything the solver cannot settle quickly is skipped (it would be too slow to verify)
  let s;
  try { s = solve(def, CAP, MS); } catch (e) { return null; }
  if (s.result !== 'win' || s.moves < MINPAR) return null;
  // keep the elements the level truly needs; the recipe's core ones (listed first in 'core') must be among them
  const needed = def.needs.filter((n) => solve(ABLATE[n](def), CAP, MS).result === 'stuck');
  if (!needed.length || (r.core || []).some((n) => !needed.includes(n))) return null;
  // every echo on the board should matter: an echo kind that is not needed makes the level confusing
  if (def.needs.filter((n) => /^[TFMK]$/.test(n)).some((n) => !needed.includes(n)) && !r.optionalEchoes) return null;
  def.needs = needed;
  if (r.enemy) { const free = solve(Object.assign({}, def, { map: def.map.map((row) => row.replace('Z', '.')) }), CAP, MS); if (free.result !== 'win' || free.moves >= s.moves) return null; }
  const label = (a) => (a.k === 'move' ? a.d[0] : a.k === 'favour' ? 'F!' : 'H(' + a.x + ',' + a.y + ')');
  def.par = s.moves; def.states = s.states; def.path = s.path.map(label).join('');
  return def;
}

/* ---------- --apply: choose 10 per world and append them to js/levels.js ---------- */
const WORLD_META = {
  7: { name: 'Echo Chamber', blurb: 'Two echoes, one set of moves.', color: '#4fe3ff', lesson: 'Two echoes read the same moves', names: ['Double Take', 'Mirror Walk', 'Two Minds', 'Shared Tape', 'Side by Side', 'Split Step', 'Out of Sync', 'Pair Bond', 'Echo Duet', 'The Chamber'] },
  8: { name: 'Heavy Rhythm', blurb: 'Crates, plates and two doors in a row.', color: '#ff9a5e', lesson: 'Crate and echo, one door each', names: ['Heavy Lifting', 'Two Locks', 'Push and Pull', 'Freight', 'Stack Up', 'Dead Weight', 'Counterweight', 'Lock Step', 'Cargo', 'The Vault'] },
  9: { name: 'Quicksilver', blurb: 'Flicker hops into sealed rooms.', color: '#c49bff', lesson: 'Hop into rooms you cannot walk into', names: ['Leap of Faith', 'Sealed Room', 'Over the Wall', 'Blink', 'Quick Drop', 'Short Fuse', 'Air Mail', 'Jump Cut', 'Skylight', 'Quicksilver'] },
  10: { name: 'Workshop', blurb: 'Mason and Keeper hold the doors.', color: '#6dffb3', lesson: 'Builders and helpers hold plates', names: ['Blueprint', 'Scaffold', 'Hired Help', 'Bricklayer', 'Day Shift', 'Toolbox', 'Foundations', 'Overtime', 'Assembly', 'The Workshop'] },
  11: { name: 'Storm Front', blurb: 'Everything at once, with the Blocker watching.', color: '#ff5c8a', lesson: 'Plan around the Blocker', names: ['Static', 'Downpour', 'Crosswind', 'Lightning Rod', 'Pressure Drop', 'Eye of the Storm', 'Thunderhead', 'Gale Warning', 'Squall Line', 'Storm Front'] },
};
const ARROW = { U: '↑', R: '→', D: '↓', L: '←' };
function planText(d) {
  const moves = d.solution.replace(/H\d+,\d+;/g, 'H').split('');
  const parts = [];
  const echoes = AM.loadLevel(d).state.echoes;
  const seenType = new Set();
  for (const e of echoes) {
    if (seenType.has(e.type) || e.type === 'keeper') continue; seenType.add(e.type);
    const heads = []; let n = 0;
    for (const m of moves) { if (!ARROW[m]) continue; if (n % e.B === 0) heads.push(ARROW[m]); n++; }
    const nm = { trace: 'Trace', flicker: 'Flicker', mason: 'Mason' }[e.type];
    parts.push('In the shortest solution, ' + nm + ' gets ' + heads.slice(0, 8).join(' ') + (heads.length > 8 ? ' …' : '') + ' as the first moves of its groups of ' + e.B + '.');
  }
  if (d.solution.includes('H')) parts.push('Use the hop to put Flicker on the sealed plate, then hurry: it jumps back after 4 moves.');
  if (d.solution.includes('F')) parts.push('Collect the coins and use Favour to make Flicker fast enough.');
  if (d.map.join('').includes('K')) parts.push('Keeper\'s helper needs a few moves to walk to the plate; be at the door when it arrives.');
  if (d.map.join('').includes('Z')) parts.push('Watch the red target: the Blocker can drop a block on the plate or in your path.');
  return 'Shortest solution: ' + d.par + ' moves. ' + parts.join(' ');
}
function introText(d, w) {
  const s = d.map.join(''), bits = [];
  if ((s.match(/T/g) || []).length > 1) bits.push('Two Traces read the same moves; only walls make them end up in different places.');
  else if (s.includes('T') && s.includes('F')) bits.push('Trace copies 1 move in 4 and Flicker 1 in 2, from the same moves.');
  if (s.includes('o')) bits.push('A crate can hold one plate for good; an echo has to hold the other.');
  if (s.includes('F') && d.needs.includes('hop')) bits.push('The plate is sealed in: only a Flicker hop can reach it.');
  if (s.includes('M')) bits.push('Mason builds a block where the first move of a group points; a block on a plate holds its door.');
  if (s.includes('K')) bits.push('Keeper sends a helper to the nearest free plate every 3 moves.');
  if (s.includes('Z')) bits.push('The Blocker marks a tile, counts down and drops a block there.');
  if (d.mode === 'together') bits.push('Echo 1 must reach the portal with you.');
  return bits.join(' ') || WORLD_META[w].blurb;
}
function apply() {
  const file = path.join(__dirname, '../js/levels.js');
  let src = fs.readFileSync(file, 'utf8');
  const LEVELS = require(file), q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  let id = LEVELS.length, worlds = '', levels = '';
  for (const w of Object.keys(WORLD_META).map(Number)) {
    const files = fs.existsSync(GEN) ? fs.readdirSync(GEN).filter((n) => new RegExp('^w' + w + '(-.*)?\\.json$').test(n)) : [];
    if (!files.length) continue;
    const uniq = new Map();
    files.forEach((n) => JSON.parse(fs.readFileSync(path.join(GEN, n))).forEach((d) => uniq.set(d.map.join('/'), d)));
    const MUST = { 8: 'crate', 9: 'hop' };
    const pool = [...uniq.values()].filter((d) => d.par <= 60 && (!MUST[w] || d.needs.includes(MUST[w]))).sort((a, b) => a.par * 1000 + a.states / 1000 - (b.par * 1000 + b.states / 1000));
    if (pool.length < 10) throw new Error('world ' + w + ' has only ' + pool.length + ' candidates');
    // spread across the difficulty range, hardest last (the boss)
    // later worlds start further up the difficulty range
    const lo = Math.min(Math.floor(pool.length * 0.1 * (w - 7)), pool.length - 10), span = pool.length - 1 - lo;
    // walk the difficulty range; at each step take the nearby candidate whose mechanic mix is least used
    const sig = (d) => d.needs.slice().sort().join('+') + (d.mode === 'together' ? '+together' : '') + (d.exitLock ? '+dual' : ''), used = {}, taken = new Set(), pick = [];
    for (let i = 0; i < 10; i++) {
      const at = lo + Math.round((i * span) / 9), win = Math.max(2, Math.round(pool.length * 0.12));
      let best = null;
      for (let j = Math.max(lo, at - win); j <= Math.min(pool.length - 1, at + win); j++) {
        if (taken.has(j)) continue;
        const score = (used[sig(pool[j])] || 0) * 1000 + Math.abs(j - at);
        if (!best || score < best.score) best = { j, score };
      }
      if (!best) for (let j = lo; j < pool.length; j++) if (!taken.has(j)) { best = { j }; break; }
      taken.add(best.j); used[sig(pool[best.j])] = (used[sig(pool[best.j])] || 0) + 1; pick.push(pool[best.j]);
    }
    pick.sort((a, b) => a.par * 1000 + a.states / 1000 - (b.par * 1000 + b.states / 1000));
    const M = WORLD_META[w];
    worlds += `    { id: ${w}, name: ${q(M.name)}, blurb: ${q(M.blurb)}, color: ${q(M.color)} },\n`;
    pick.forEach((d, i) => {
      id++;
      const enc = d.path.replace(/F!/g, 'F').replace(/H\((\d+),(\d+)\)/g, 'H$1,$2;');
      const def = Object.assign({}, d, { id, solution: enc });
      const f2 = [`id: ${id}`, `world: ${w}`, `name: ${q(M.names[i])}`, `par: ${d.par}`, `mode: ${q(d.mode)}`];
      if (d.required && d.required.length) f2.push(`required: [${d.required.join(', ')}]`);
      if (d.exitLock) f2.push(`exitLock: [${d.exitLock.map(q).join(', ')}]`);
      if (d.luck0) f2.push(`luck0: ${d.luck0}`);
      if (i >= 7 && w >= 9) f2.push(`maxMoves: ${d.par + 3}`);
      f2.push(`needs: [${d.needs.map(q).join(', ')}]`);
      levels += `    {\n      ${f2.join(', ')},\n      lesson: ${q(M.lesson)},\n      intro: ${q(introText(def, w))},\n      plan: ${q(planText(def))},\n      solution: ${q(enc)},\n      map: [\n${d.map.map((r) => '        ' + q(r) + ',').join('\n')}\n      ],\n    },\n`;
    });
  }
  src = src.replace(/(\n  \];\n  const LEVELS = \[)/, '\n' + worlds.replace(/\n$/, '') + '$1');
  src = src.replace(/\n  \];\n  LEVELS\.WORLDS = WORLDS;/, '\n' + levels.replace(/\n$/, '') + '\n  ];\n  LEVELS.WORLDS = WORLDS;');
  fs.writeFileSync(file, src);
  console.log('levels now', id);
}
module.exports = { RECIPES, candidate };

// run after everything below is defined
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--apply') apply();
  else {
    const world = +args[0], tries = +(args[1] || 400), seed = +(args[2] || world * 7919), out = path.join(GEN, 'w' + world + (args[3] ? '-' + args[3] : '') + '.json');
    const rng = rngOf(seed), found = [], seen = new Set();
    if (!fs.existsSync(GEN)) fs.mkdirSync(GEN);
    for (let i = 0; i < tries; i++) {
      const d = candidate(world, rng);
      if (!d || seen.has(d.map.join('/'))) continue;
      seen.add(d.map.join('/')); found.push(d);
      console.log('w' + world, 'found', found.length, 'par', d.par, 'states', d.states);
      fs.writeFileSync(out, JSON.stringify(found, null, 1));
    }
  }
}

