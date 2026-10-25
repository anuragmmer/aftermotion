const AM = require('../js/engine.js'); const LEVELS = require('../js/levels.js');
const [id, ...path] = process.argv.slice(2);
const def = Object.assign({}, LEVELS.find((l) => l.id === +id));
let { level: L, state: S } = AM.loadLevel(def);
for (const a of path) { const r = AM.step(L, S, a); S = r.state; console.log(S.moves, a, r.accepted ? '' : '(rejected)', r.events.map((e) => e.text).join(' | ')); }
