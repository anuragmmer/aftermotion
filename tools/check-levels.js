// Level quality checker. For each level: proves it is solvable (within maxMoves), reports the
// optimal move count (par), and runs "needs" ablations: removing a taught element must make the
// level unsolvable, so every level actually requires the mechanic it claims to teach.
// usage: node tools/check-levels.js [file] [id ...]     (file defaults to js/levels.js)
const path = require('path');
const AM = require('../js/engine.js');

const ABLATE = {
  T: (d) => freeze(d, 'trace'), F: (d) => freeze(d, 'flicker'), M: (d) => freeze(d, 'mason'), K: (d) => freeze(d, 'keeper'),
  crate: (d) => strip(d, 'o'), enemy: (d) => strip(d, 'Z'),
  hop: (d) => Object.assign({}, d, { overrides: hopOff(d) }),
  favour: (d) => Object.assign({}, strip(d, 'c*'), { luck0: 0 }),
};
function strip(def, chars) {
  const echo = /[TFMK]/.test(chars);
  return Object.assign({}, def, { map: def.map.map((r) => r.replace(new RegExp('[' + chars + ']', 'g'), '.')), required: echo ? [] : def.required, mode: echo ? 'through' : def.mode });
}
// An echo of this type stays on the board (same ids, same tile) but never acts.
function freeze(def, type) {
  const o = Object.assign({}, def.overrides || {});
  AM.loadLevel(def).state.echoes.forEach((e) => { if (e.type === type) o[e.id] = Object.assign({}, o[e.id], { inert: true }, e.hop ? { hop: { origin: null, hold: 0, charges: 0 } } : {}); });
  return Object.assign({}, def, { overrides: o });
}
function hopOff(def) {
  const o = Object.assign({}, def.overrides || {});
  const { state } = AM.loadLevel(def);
  state.echoes.forEach((e) => { if (e.hop) o[e.id] = Object.assign({}, o[e.id], { hop: { origin: null, hold: 0, charges: 0 } }); });
  return o;
}
const label = (a) => (a.k === 'move' ? a.d[0] : a.k === 'favour' ? 'F!' : `H(${a.x},${a.y})`);
function solve(def, cap, ms) {
  const { level, state } = AM.loadLevel(def);
  const t = Date.now(), r = AM.canWin(level, state, { cap: cap || 1200000, ms: ms || Infinity });
  return Object.assign(r, { ms: Date.now() - t, moves: r.path ? r.path.filter((a) => a.k === 'move').length : null });
}
function check(def) {
  const r = solve(def), out = { id: def.id, name: def.name, ok: r.result === 'win', par: r.moves, states: r.states, ms: r.ms, path: r.path ? r.path.map(label).join('') : r.result, needs: [] };
  for (const n of def.needs || []) {
    const ab = solve(ABLATE[n](def));
    out.needs.push({ n, holds: ab.result === 'stuck', got: ab.result === 'win' ? 'solvable in ' + ab.moves : ab.result });
  }
  return out;
}
module.exports = { check, solve, ABLATE };
if (require.main === module) {
  const args = process.argv.slice(2);
  const file = args[0] && !/^\d+$/.test(args[0]) ? path.resolve(args.shift()) : path.join(__dirname, '../js/levels.js');
  const ids = args.map(Number);
  let bad = 0;
  for (const def of require(file)) {
    if (ids.length && !ids.includes(def.id)) continue;
    const c = check(def);
    const needs = c.needs.map((x) => (x.holds ? '✓' : '✗') + x.n + (x.holds ? '' : '(' + x.got + ')')).join(' ');
    const parFlag = c.ok && def.par && def.par !== c.par ? ' PAR≠' + def.par : '';
    if (!c.ok || c.needs.some((x) => !x.holds) || parFlag) bad++;
    console.log(`${String(c.id).padStart(3)} ${c.ok ? 'ok ' : 'FAIL'} par=${c.par} ${c.states}st ${c.ms}ms ${needs}${parFlag}  ${c.name}\n      ${c.path}`);
  }
  if (bad) { console.log(bad + ' level(s) need attention'); process.exitCode = 1; }
}
