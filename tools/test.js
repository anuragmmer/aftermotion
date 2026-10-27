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
t('Stuck detection: jammed push block is reported stuck, fresh level is not', () => {
  const def = LEVELS.find((l) => l.id === 4); let { level: L, state } = AM.loadLevel(def);
  assert.strictEqual(AM.canWin(L, state).result, 'win');
  const jam = run(L, state, ['RIGHT', 'RIGHT']).S; // pushes block against the wall beside the door
  const S = run(L, jam, ['RIGHT', 'RIGHT']).S;
  assert.strictEqual(AM.canWin(L, S).result, 'stuck');
  assert.strictEqual(AM.canWin(L, S, { cap: 3 }).result === 'win', false);
});
t('Stuck detection: out-of-moves state is stuck', () => {
  const { level: L, state } = AM.loadLevel(LEVELS.find((l) => l.id === 9)); const S = AM.clone(state); S.moves = 13;
  assert.strictEqual(AM.canWin(L, S).result, 'stuck');
});
const P = require('../js/progress.js');
t('Rewards: first clear, star bonus, no-hint bonus and coins', () => {
  const prog = P.defaults(), lv = { id: 3, par: 12 };
  const r = P.applyClear(prog, lv, { moves: 12, collected: 2, usedHint: false }, 0);
  assert.strictEqual(r.stars, 3); assert.ok(r.first);
  assert.strictEqual(r.total, 32 + 16 + 5 + 10); assert.strictEqual(prog.coins, r.total);
});
t('Rewards: replays decay 50/25/12.5%, cap at 3, regenerate after 8h, lifetime cap 10', () => {
  const prog = P.defaults(), lv = { id: 1, par: 8 }, H = 3600 * 1000;
  P.applyClear(prog, lv, { moves: 8, collected: 0, usedHint: true }, 0);
  const pay = (t) => P.applyClear(prog, lv, { moves: 8, collected: 0 }, t).total;
  assert.deepStrictEqual([pay(1), pay(2), pay(3), pay(4)], [15, 8, 4, P.RULES.practicePay], 'capped replays fall back to practice pay');
  assert.strictEqual(pay(3 + 8 * H), 4); // one step regenerated
  for (let i = 0; i < 20; i++) pay(100 * H * (i + 1));
  assert.strictEqual(prog.levels[1].life, 10);
  assert.strictEqual(pay(1e13), P.RULES.practicePay);
});
t('Rewards: star upgrade on replay pays the difference once; ★1 replays pay nothing', () => {
  const prog = P.defaults(), lv = { id: 1, par: 8 };
  P.applyClear(prog, lv, { moves: 20, collected: 0, usedHint: true }, 0);
  const r = P.applyClear(prog, lv, { moves: 8, collected: 0 }, 1);
  assert.strictEqual(r.lines[0].value, 10);
  const low = P.applyClear(prog, lv, { moves: 30, collected: 0 }, 2);
  assert.strictEqual(low.total, 0);
});
t('Hints: one free per day, then cost coins; unlocks are sequential', () => {
  const prog = P.defaults();
  assert.ok(P.chargeHint(prog, 'd1').free);
  assert.ok(!P.chargeHint(prog, 'd1').ok);
  prog.coins = 40; assert.strictEqual(P.chargeHint(prog, 'd1').cost, 30); assert.strictEqual(prog.coins, 10);
  assert.ok(P.isUnlocked(prog, LEVELS, 0)); assert.ok(!P.isUnlocked(prog, LEVELS, 1));
  P.applyClear(prog, LEVELS[0], { moves: 99, collected: 0 }, 0); assert.ok(P.isUnlocked(prog, LEVELS, 1));
});
t('Daily echo: one reward per day, streak grows on consecutive days and resets after a gap', () => {
  const prog = P.defaults();
  assert.strictEqual(P.dailyLevelIndex(prog, LEVELS, '2026-10-27'), -1, 'locked until a level is cleared');
  P.applyClear(prog, LEVELS[0], { moves: 99, collected: 0 }, 0); P.applyClear(prog, LEVELS[1], { moves: 99, collected: 0 }, 0);
  const i = P.dailyLevelIndex(prog, LEVELS, '2026-10-27'); assert.ok(i === 0 || i === 1);
  assert.strictEqual(P.dailyLevelIndex(prog, LEVELS, '2026-10-27'), i, 'stable within a day');
  const c0 = prog.coins;
  assert.strictEqual(P.applyDaily(prog, '2026-10-27', false).total, 60);
  assert.ok(P.applyDaily(prog, '2026-10-27', true).already); assert.strictEqual(prog.coins, c0 + 60);
  const d2 = P.applyDaily(prog, '2026-10-28', true); assert.strictEqual(d2.streak, 2); assert.strictEqual(d2.total, 120 + 20);
  assert.strictEqual(P.dailyStatus(prog, '2026-10-30').streak, 0, 'missed a day');
  assert.strictEqual(P.applyDaily(prog, '2026-10-30', false).streak, 1);
});
const Shop = require('../js/shop.js');
t('Shop: defaults owned, buying cosmetics and boosts, equipping, milestones', () => {
  const prog = Shop.init(P.defaults());
  assert.strictEqual(prog.equip.face, 'letter');
  assert.ok(Shop.owns(prog, LEVELS, Shop.byId('cyan')));
  assert.ok(!Shop.buy(prog, LEVELS, 'robot').ok, 'too poor');
  prog.coins = 1000;
  assert.ok(Shop.buy(prog, LEVELS, 'robot').ok); assert.strictEqual(prog.coins, 1000 - Shop.byId('robot').price);
  assert.ok(!Shop.buy(prog, LEVELS, 'robot').ok, 'no double buy');
  assert.ok(Shop.equip(prog, LEVELS, 'robot')); assert.strictEqual(prog.equip.face, 'robot');
  assert.ok(!Shop.equip(prog, LEVELS, 'smile'), 'milestone not reached yet');
  assert.ok(Shop.buy(prog, LEVELS, 'hint3').ok); assert.strictEqual(prog.inv.hint, 3);
  assert.ok(Shop.useBoost(prog, 'hint')); assert.strictEqual(prog.inv.hint, 2);
  LEVELS.filter((l) => l.world === 1).forEach((l) => P.applyClear(prog, l, { moves: l.par, collected: 0 }, 0));
  const fresh = Shop.newUnlocks(prog, LEVELS).map((i) => i.id);
  assert.deepStrictEqual(fresh, ['smile']); assert.deepStrictEqual(Shop.newUnlocks(prog, LEVELS), [], 'reported once');
  assert.ok(Shop.equip(prog, LEVELS, 'smile'));
  assert.ok(Shop.nextGoal(prog, LEVELS).item.price);
});
t('Characters: at least 50 unique, each renders all four moods and tracking pupils', () => {
  const Chars = require('../js/characters.js');
  assert.ok(Chars.ROSTER.length >= 50);
  assert.strictEqual(new Set(Chars.ROSTER.map((c) => c.id)).size, Chars.ROSTER.length);
  for (const c of Chars.ROSTER) {
    const svg = Chars.render(c);
    for (const k of ['e-n', 'e-h', 'e-x', 'e-z', 'm-n', 'm-h', 'm-x', 'm-z']) assert.ok(svg.includes('class="' + k) || svg.includes(' ' + k + '"'), c.id + ' ' + k);
    assert.ok(!/NaN|undefined/.test(svg), c.id + ' bad svg');
    assert.ok(c.price || c.milestone, c.id + ' needs a price or milestone');
  }
  ['kitty', 'kingcat', 'neonking', 'skully', 'skullking', 'neonskull'].forEach((id) => assert.ok(Chars.ROSTER.find((c) => c.id === id), id));
});
t('Catalog: unique ids, valid auras, legendaries everywhere, active aura follows equipment', () => {
  assert.strictEqual(new Set(Shop.CATALOG.map((c) => c.id)).size, Shop.CATALOG.length);
  for (const c of Shop.CATALOG) if (c.aura) assert.ok(Shop.AURAS[c.aura], c.id);
  for (const slot of ['face', 'orb', 'trail', 'portal']) assert.ok(Shop.CATALOG.filter((c) => c.slot === slot && c.rarity === 'legendary').length >= 4, slot);
  const prog = Shop.init(P.defaults());
  assert.strictEqual(Shop.activeAura(prog), null);
  prog.owned.lightning = true; Shop.equip(prog, LEVELS, 'lightning'); assert.strictEqual(Shop.activeAura(prog), 'storm');
  prog.owned.phoenix = true; Shop.equip(prog, LEVELS, 'phoenix'); assert.strictEqual(Shop.activeAura(prog), 'inferno', 'character aura wins');
});
const R = require('../js/rewards.js');
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
t('Luck: echo steps and coins fill it, bumps drain it, gentle clears add a bonus, Favour spends 100', () => {
  const prog = R.init(P.defaults());
  R.addLuck(prog, R.luckFromEvents([{ type: 'ECHO_MOVED', text: '' }, { type: 'ECHO_MOVED', text: '' }, { type: 'LUCK', text: '' }]));
  assert.strictEqual(prog.luck, 9);
  R.addLuck(prog, R.luckFromEvents([{ type: 'ECHO_BLOCKED', text: 'Echo tries UP: blocked by wall.' }]));
  assert.strictEqual(prog.luck, 4);
  R.addLuck(prog, -50); assert.strictEqual(prog.luck, 0);
  R.addLuck(prog, 500); assert.strictEqual(prog.luck, 100); assert.ok(R.luckFull(prog));
  assert.ok(R.spendLuck(prog)); assert.strictEqual(prog.luck, 0); assert.ok(!R.spendLuck(prog));
});
t('Quests: 3 per day (one per band), deterministic, progress, claim, all-done bonus', () => {
  const prog = R.init(P.defaults()), day = '2026-11-02';
  const q = R.ensureQuests(prog, day);
  assert.deepStrictEqual(q.list.map((x) => R.qById(x.id).band), [0, 1, 2]);
  assert.deepStrictEqual(R.init(P.defaults()) && R.ensureQuests(R.init(P.defaults()), day).list.map((x) => x.id), q.list.map((x) => x.id));
  for (const x of q.list) { const d = R.qById(x.id); R.questEvent(prog, day, d.ev, d.goal); }
  const c0 = prog.coins, spins0 = prog.wheel.spins;
  q.list.forEach((x) => assert.ok(R.claimQuest(prog, day, x.id)));
  assert.ok(prog.coins > c0); assert.strictEqual(prog.wheel.spins, spins0 + 1); assert.ok(prog.chestQueue.some((c) => c.source === 'All daily quests'));
  assert.strictEqual(R.claimQuest(prog, day, q.list[0].id), null, 'no double claim');
});
t('Chests: tiers pay within their ranges, never drop legendaries, duplicates convert to coins', () => {
  const prog = R.init(P.defaults());
  ['bronze', 'silver', 'gold', 'mythic'].forEach((tier) => R.grantChest(prog, tier, 'test'));
  const out = [0, 1, 2, 3].map(() => R.openChest(prog, LEVELS, seq(0.01, 0.5, 0.99)));
  out.forEach((o) => { const T = R.CHESTS[o.tier]; assert.ok(o.coins >= T.coins[0] && o.coins <= T.coins[1]); if (o.item) assert.notStrictEqual(o.item.rarity, 'legendary'); });
  assert.ok(out[3].item, 'mythic always has a cosmetic'); assert.strictEqual(prog.stats.chests, 4);
  assert.strictEqual(R.openChest(prog, LEVELS), null);
});
t('Wheel: one free spin a day, banked spins capped, pity guarantees a chest after 4 dry spins', () => {
  const prog = R.init(P.defaults()), day = '2026-11-02';
  assert.strictEqual(R.spinsAvailable(prog, day), 1);
  assert.strictEqual(R.spin(prog, day, () => 0).seg.n, 60);
  assert.strictEqual(R.spinsAvailable(prog, day), 0); assert.strictEqual(R.spin(prog, day), null);
  R.addSpins(prog, 99); assert.strictEqual(prog.wheel.spins, R.MAX_SPINS);
  for (let i = 0; i < 3; i++) R.spin(prog, day, () => 0);
  const p = R.spin(prog, day, () => 0); assert.ok(p.pity); assert.strictEqual(p.seg.k, 'chest');
});
t('Achievements: claim tiers in order with coins + chest; legendary gates use the same stats', () => {
  const prog = R.init(P.defaults());
  LEVELS.slice(0, 4).forEach((l) => P.applyClear(prog, l, { moves: l.par, collected: 0 }, 0));
  const s = R.achState(prog, LEVELS, R.ACH[0]); assert.ok(s.claimable);
  const r = R.claimAch(prog, LEVELS, 'stargazer'); assert.strictEqual(r.coins, 150); assert.strictEqual(prog.ach.stargazer, 1);
  assert.ok(!R.achState(prog, LEVELS, R.ACH[0]).claimable);
  const g = Shop.gateStatus(prog, LEVELS, Shop.byId('stormcaller').gate); assert.ok(!g.met); assert.strictEqual(g.have, 12);
  prog.coins = 1e9; assert.ok(!Shop.buy(prog, LEVELS, 'stormcaller').ok, 'gate blocks even with coins');
});
t('Clears: every 3rd new level and boss levels grant chests; stars every 10 grant silver', () => {
  const prog = R.init(P.defaults()); const got = [];
  for (const l of LEVELS.slice(0, 10)) { const rc = P.applyClear(prog, l, { moves: l.par, collected: 0 }, 0); got.push(...R.onClear(prog, LEVELS, { level: l, stars: rc.stars, perfect: true, bumps: 0, hasEchoes: true, first: true, coinsTotal: rc.total }, '2026-11-02').chests); }
  assert.strictEqual(got.filter((c) => c === 'bronze').length, 3);
  assert.ok(got.includes('gold') && got.includes('mythic'));
  assert.strictEqual(got.filter((c) => c === 'silver').length, 3 + 1, '30 stars -> 3 silver, boss at par -> 1');
});
t('Boosted runs cap at 2 stars; skip tickets unlock the next level without stars', () => {
  const prog = P.defaults();
  assert.strictEqual(P.applyClear(prog, LEVELS[0], { moves: LEVELS[0].par, collected: 0, assisted: true }, 0).stars, 2);
  P.skipLevel(prog, LEVELS[1]);
  assert.ok(P.isUnlocked(prog, LEVELS, 2)); assert.strictEqual(P.nextLevelIndex(prog, LEVELS), 2);
  assert.strictEqual(P.record(prog, LEVELS[1].id).stars, 0);
});
function replay(def) {
  let { level: L, state: S } = AM.loadLevel(def);
  for (const tok of def.solution.match(/H\d+,\d+;|[URDLF]/g)) {
    if (tok[0] === 'H') { const [x, y] = tok.slice(1, -1).split(',').map(Number); const r = AM.hop(L, S, S.echoes.find((e) => e.hop).id, x, y); assert.ok(r.ok, 'hop ' + tok); S = r.state; }
    else if (tok === 'F') { const r = AM.activateFavour(L, S); assert.ok(r.ok, 'favour'); S = r.state; }
    else { const r = AM.step(L, S, { U: 'UP', R: 'RIGHT', D: 'DOWN', L: 'LEFT' }[tok]); assert.ok(r.accepted, 'move ' + tok); S = r.state; }
  }
  return S;
}
for (const def of LEVELS) t(`Level ${def.id} "${def.name}": stored solution wins in par (${def.par}) moves`, () => {
  const S = replay(def);
  assert.strictEqual(S.status, 'won'); assert.strictEqual(S.moves, def.par);
  assert.ok(def.lesson && def.intro && def.plan, 'level text');
  const w = def.map[0].length; def.map.forEach((r) => assert.strictEqual(r.length, w));
});
t('Levels are numbered 1..N in order and grouped into worlds of 10', () => {
  LEVELS.forEach((d, i) => { assert.strictEqual(d.id, i + 1); assert.strictEqual(d.world, Math.ceil(d.id / 10)); });
  assert.ok(LEVELS.length >= 60); assert.strictEqual(LEVELS.WORLDS.length, Math.ceil(LEVELS.length / 10));
});
console.log(`\n${pass} passed`);
