const { solve } = require('./solve.js');
const LEVELS = require('../js/levels.js');
const id = +process.argv[2], patch = JSON.parse(process.argv[3] || '{}');
const def = Object.assign({}, LEVELS.find((l) => l.id === id), patch);
const r = solve(def, 900000);
console.log(r.error || r.moves, r.states); if (r.path) console.log(r.path.join(' '));
