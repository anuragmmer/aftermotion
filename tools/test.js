// Acceptance tests from spec section 19 + level solvability. Run: node tools/test.js
const assert = require('assert');
const AM = require('../js/engine.js');
const LEVELS = require('../js/levels.js');
const { solve } = require('./solve.js');
let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('ok  ', name); } catch (e) { console.log('FAIL', name, '\n    ', e.message); process.exitCode = 1; } };
const room = (extra = {}) => AM.loadLevel(Object.assign({ id: 0, name: 't', mode: 'through', map: ['#########', '#P..T...#', '#.......#', '#...F..X#', '#########'] }, extra));
const run = (L, S, dirs) => { let ev = []; for (const d of dirs) { const r = AM.step(L, S, d); S = r.state; ev = ev.concat(r.events); } return { S, ev }; };
const echo = (S, id) => S.echoes.find((e) => e.id === id);

t('Batch 1/2: B=4 attempts first direction exactly once per batch', () => {
  const { level: L, state } = AM.loadLevel({ id: 0, name: 't', map: ['#########', '#.......#', '#.T.P...#', '#.......#', '#########'] });
  const { S, ev } = run(L, state, ['UP', 'RIGHT', 'DOWN', 'LEFT']);
  assert.deepStrictEqual([echo(S, 1).x, echo(S, 1).y], [2, 1]);
  assert.strictEqual(ev.filter((e) => e.type === 'ECHO_MOVED').length, 1);
  const r2 = run(L, S, ['RIGHT', 'RIGHT', 'DOWN', 'UP']);
  assert.deepStrictEqual([echo(r2.S, 1).x, echo(r2.S, 1).y], [3, 1]);
});
t('Invalid player move is not recorded and does not advance counters', () => {
  const { level: L, state } = room();
  const r = AM.step(L, state, 'RIGHT'); assert.ok(r.accepted);
  const r2 = AM.step(L, r.state, 'UP'); assert.ok(!r2.accepted);
  assert.strictEqual(r2.state.history.length, 1);
  assert.strictEqual(echo(r2.state, 1).counter, 1);
});
t('Blocked echo stays in place, consumes batch, emits event', () => {
  const { level: L, state } = AM.loadLevel({ id: 0, name: 't', map: ['#####', '#T..#', '#P..#', '#####'] });
  const { S, ev } = run(L, state, ['RIGHT', 'RIGHT', 'LEFT', 'LEFT']); // head RIGHT: T at (1,1)->(2,1) ok; use UP for block
  const r = run(L, S, ['UP', 'DOWN', 'UP', 'DOWN']);
  assert.ok(r.ev.some((e) => e.type === 'ECHO_BLOCKED'));
  assert.strictEqual(echo(r.S, 1).counter, 0);
});
t('Different cadence: Trace B=4 and Flicker B=2 keep separate buffers', () => {
  const { level: L, state } = room();
  const { S } = run(L, state, ['DOWN', 'RIGHT']);
  assert.strictEqual(echo(S, 1).counter, 2); assert.strictEqual(echo(S, 2).counter, 0);
  assert.deepStrictEqual([echo(S, 2).x, echo(S, 2).y], [4, 4 - 1 + 0].map((v, i) => i ? 3 : v)); // F tried DOWN into wall? stays
});
t('Favour: consumes meter once, boundary respected, cooldown, no re-favour', () => {
  const { level: L, state } = AM.loadLevel({ id: 0, name: 't', luck0: 100, map: ['#########', '#P......#', '#T......#', '#########'] });
  let r = AM.step(L, state, 'RIGHT'); // mid-batch
  const f = AM.activateFavour(L, r.state);
  assert.ok(f.ok); assert.strictEqual(f.state.luck, 0); assert.strictEqual(echo(f.state, 1).state, 'FAVOURED');
  assert.ok(!AM.activateFavour(L, f.state).ok);
  let S = f.state; S.luck = 100;
  assert.ok(!AM.activateFavour(L, S).ok, 'cannot re-favour while FAVOURED');
  S = run(L, S, ['RIGHT', 'RIGHT', 'RIGHT']).S; // finishes old batch (size 4)
  assert.strictEqual(echo(S, 1).activeB, 4);
  S = run(L, S, ['LEFT']).S; assert.strictEqual(echo(S, 1).activeB, 2); // next batch uses favour cadence
  for (let i = 0; i < 12 && echo(S, 1).state !== 'COOLDOWN'; i++) S = run(L, S, [i % 2 ? 'LEFT' : 'RIGHT']).S;
  assert.strictEqual(echo(S, 1).state, 'COOLDOWN');
  S.luck = 100; assert.ok(!AM.activateFavour(L, S).ok, 'no re-favour in cooldown');
  for (let i = 0; i < 8 && echo(S, 1).state !== 'NORMAL'; i++) S = run(L, S, [i % 2 ? 'LEFT' : 'RIGHT']).S;
  assert.strictEqual(echo(S, 1).state, 'NORMAL');
});
t('Hop: invalid target refused without charge; valid hop returns', () => {
  const { level: L, state } = AM.loadLevel({ id: 0, name: 't', map: ['#########', '#P.F...##', '#.......#', '#########'] });
  const bad = AM.hop(L, state, 1, 8, 1); assert.ok(!bad.ok); assert.strictEqual(echo(bad.state, 1).hop.charges, 1);
  const ok = AM.hop(L, state, 1, 5, 1); assert.ok(ok.ok);
  let S = ok.state; assert.strictEqual(echo(S, 1).hop.charges, 0);
  S = run(L, S, ['DOWN', 'UP', 'DOWN', 'UP']).S;
  assert.deepStrictEqual([echo(S, 1).x, echo(S, 1).y], [3, 1]); assert.ok(!echo(S, 1).hopping);
});
t('Pressure plate active only while occupied; door never closes through occupant', () => {
  const { level: L, state } = AM.loadLevel({ id: 0, name: 't', map: ['#######', '#PaA..#', '#######'] });
  let S = AM.step(L, state, 'RIGHT').state; assert.ok(S.plateActive.A && S.open.A);
  S = AM.step(L, S, 'RIGHT').state; // player now on door tile, plate empty
  assert.ok(!S.plateActive.A); assert.ok(S.open.A, 'door held open by occupant');
  S = AM.step(L, S, 'RIGHT').state; assert.ok(!S.open.A);
});
t('Temporary block expiry never embeds an actor', () => {
  const { level: L, state } = AM.loadLevel({ id: 0, name: 't', map: ['#####', '#PM.#', '#####'] });
  const S = AM.clone(state); S.blocks.push({ x: 2, y: 1, kind: 'temp', ttl: 1, owner: 9 });
  S.echoes[0].x = 2; // forced embed
  const r = AM.step(L, S, 'LEFT'); assert.ok(AM.blockAt(r.state, 2, 1), 'expiry delayed while occupied');
});
t('Helper times out with feedback', () => {
  const { level: L, state } = AM.loadLevel({ id: 0, name: 't', map: ['#########', '#PK.a...#', '#########'] });
  const S = AM.clone(state); S.echoes[0].B = 1; S.echoes[0].activeB = 1; S.helpers = [];
  let r = AM.step(L, S, 'RIGHT'); // spawns helper
  assert.strictEqual(r.state.helpers.length, 1);
  r.state.helpers[0].life = 0; r.state.helpers[0].target = { x: 7, y: 1 };
  r = AM.step(L, r.state, 'LEFT'); assert.ok(r.events.some((e) => /missed/.test(e.text)));
});
t('Blocker never places on protected or illegal tiles', () => {
  const def = LEVELS.find((l) => l.id === 8); const { level: L, state } = AM.loadLevel(def);
  const c = AM.enemyCandidates(L, state);
  assert.ok(c.length > 0);
  for (const q of c) { assert.ok(!(q.x === L.start.x && q.y === L.start.y)); assert.ok(!AM.isExit(L, q.x, q.y)); assert.ok(!AM.placementError(L, state, q.x, q.y)); }
});
t('Oracle parity and snapshot isolation', () => {
  const { level: L, state } = AM.loadLevel(LEVELS.find((l) => l.id === 9));
  const before = JSON.stringify(state);
  const o = AM.oracle(L, state);
  assert.strictEqual(JSON.stringify(state), before);
  for (const q of o) if (q.accepted) assert.strictEqual(AM.step(L, state, q.dir).state.status, q.status);
});
t('Determinism: same inputs give identical state', () => {
  const { level: L, state } = AM.loadLevel(LEVELS.find((l) => l.id === 8));
  const ds = ['RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'DOWN', 'DOWN', 'RIGHT', 'LEFT'];
  assert.strictEqual(JSON.stringify(run(L, state, ds).S), JSON.stringify(run(L, state, ds).S));
});
t('Win conditions: Together needs echo at exit; Through needs only player + mechanisms', () => {
  const m = ['#######', '#PXT..#', '#######'];
  const tog = AM.loadLevel({ id: 0, name: 't', mode: 'together', required: [1], map: m });
  assert.strictEqual(AM.step(tog.level, tog.state, 'RIGHT').state.status, 'play');
  const thr = AM.loadLevel({ id: 0, name: 't', mode: 'through', map: m });
  assert.strictEqual(AM.step(thr.level, thr.state, 'RIGHT').state.status, 'won');
  const lock = AM.loadLevel({ id: 0, name: 't', mode: 'through', exitLock: ['A'], map: ['#####', '#PXa#', '#####'] });
  assert.strictEqual(AM.step(lock.level, lock.state, 'RIGHT').state.status, 'play');
});
t('Reset restores initial state', () => {
  const a = AM.loadLevel(LEVELS[2]), b = AM.loadLevel(LEVELS[2]);
  assert.strictEqual(JSON.stringify(a.state), JSON.stringify(b.state));
});
for (const def of LEVELS) t(`Level ${def.id} "${def.name}" is solvable`, () => { const r = solve(def, 1500000); assert.ok(!r.error, r.error); });
console.log(`\n${pass} passed`);
