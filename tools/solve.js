// BFS solver used to prove each level has a valid solution.
// usage: node tools/solve.js [levelId]
const AM = require('../js/engine.js');
const LEVELS = require('../js/levels.js');

function actionsFor(L, S) {
  const acts = AM.DIR_NAMES.map((d) => ({ k: 'move', d }));
  if (AM.favourReady(S)) acts.push({ k: 'favour' });
  for (const e of S.echoes) if (e.hop && !e.hopping && e.hop.charges > 0)
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++)
      if (!AM.hopError(L, S, e, e.x + dx, e.y + dy)) acts.push({ k: 'hop', id: e.id, x: e.x + dx, y: e.y + dy });
  return acts;
}
function sig(S) { const c = AM.clone(S); delete c.history; delete c.stats; delete c.tick; return JSON.stringify(c); }
function label(a) { return a.k === 'move' ? a.d : a.k === 'favour' ? 'FAVOUR' : `HOP${a.id}(${a.x},${a.y})`; }

function solve(def, cap = 400000) {
  const { level: L, state: S0 } = AM.loadLevel(def);
  const seen = new Set([sig(S0)]);
  let frontier = [{ S: S0, path: [] }], n = 0;
  while (frontier.length) {
    const next = [];
    for (const { S, path } of frontier) for (const a of actionsFor(L, S)) {
      let S2;
      if (a.k === 'move') { const r = AM.step(L, S, a.d); if (!r.accepted) continue; S2 = r.state; }
      else if (a.k === 'favour') S2 = AM.activateFavour(L, S).state;
      else S2 = AM.hop(L, S, a.id, a.x, a.y).state;
      const p = path.concat(label(a));
      if (S2.status === 'won') return { moves: p.filter((q) => !/FAVOUR|HOP/.test(q)).length, path: p, states: n };
      if (S2.status === 'lost') continue;
      const s = sig(S2);
      if (seen.has(s)) continue;
      seen.add(s); n++;
      if (n > cap) return { error: 'cap', states: n };
      next.push({ S: S2, path: p });
    }
    frontier = next;
  }
  return { error: 'unsolvable', states: n };
}
module.exports = { solve };
if (require.main === module) {
  const only = process.argv[2];
  for (const def of LEVELS) {
    if (only && +only !== def.id) continue;
    const r = solve(def);
    console.log(def.id, def.name, r.error ? 'FAIL ' + r.error : 'ok ' + r.moves + ' moves', `(${r.states} states)`);
    if (r.path) console.log('   ', r.path.join(' '));
  }
}
