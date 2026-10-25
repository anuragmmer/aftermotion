// Solver used to prove each level has a valid solution (shares engine.canWin).
// usage: node tools/solve.js [levelId]
const AM = require('../js/engine.js');
const LEVELS = require('../js/levels.js');
const label = (a) => (a.k === 'move' ? a.d : a.k === 'favour' ? 'FAVOUR' : `HOP${a.id}(${a.x},${a.y})`);
function solve(def, cap = 400000) {
  const { level: L, state } = AM.loadLevel(def);
  const r = AM.canWin(L, state, { cap });
  if (r.result !== 'win') return { error: r.result === 'stuck' ? 'unsolvable' : 'cap', states: r.states };
  const path = r.path.map(label);
  return { moves: r.path.filter((a) => a.k === 'move').length, path, states: r.states };
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
