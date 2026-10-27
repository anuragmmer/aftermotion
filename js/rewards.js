/* Aftermotion rewards engine (see docs/Rewards_Economy_Design.md).
 * Persistent Luck meter, player stats, daily quests, achievements, tiered chests and the reward
 * wheel. Pure rules over the save data; randomness is injected (rng) so it can be tested. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./progress.js'), require('./shop.js'));
  else root.AMRewards = factory(root.AMProgress, root.AMShop);
})(typeof self !== 'undefined' ? self : this, function (P, Shop) {
  'use strict';

  /* ---------- state ---------- */
  function init(prog) {
    Shop.init(prog);
    prog.stats = Object.assign({ echoSteps: 0, echoBumps: 0, gentle: 0, clears: 0, chests: 0, spins: 0, favours: 0, coinsEarned: 0, moves: 0, hints: 0, jackpots: 0, firstClears: 0 }, prog.stats || {});
    prog.luck = Math.max(0, Math.min(100, prog.luck || 0));
    prog.chestQueue = prog.chestQueue || [];
    prog.quests = prog.quests || { day: '', list: [], bonus: false };
    prog.ach = prog.ach || {};
    prog.wheel = Object.assign({ freeDay: '', spins: 0, dry: 0 }, prog.wheel || {});
    if (prog.starChests === undefined) prog.starChests = prog.chests || 0; // older saves counted opened star chests here
    return prog;
  }
  const rint = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  function earn(prog, n) { prog.coins += n; prog.stats.coinsEarned += n; return n; }

  /* ---------- persistent Luck: grows when echoes are treated gently ---------- */
  const LUCK = { step: 2, bump: -5, coin: 5, gentle: 12, max: 100, cost: 100 };
  function luckFromEvents(events) {
    let d = 0;
    for (const e of events) {
      if (e.type === 'ECHO_MOVED') d += LUCK.step;
      else if (e.type === 'ECHO_BLOCKED' && /tries|tried/.test(e.text)) d += LUCK.bump;
      else if (e.type === 'LUCK') d += LUCK.coin;
    }
    return d;
  }
  function addLuck(prog, d) { const before = prog.luck; prog.luck = Math.max(0, Math.min(LUCK.max, prog.luck + d)); return prog.luck - before; }
  const luckFull = (prog) => prog.luck >= LUCK.cost;
  function spendLuck(prog) { if (!luckFull(prog)) return false; prog.luck -= LUCK.cost; prog.stats.favours++; return true; }

  /* ---------- daily quests ---------- */
  const QUESTS = [
    { id: 'clear2', band: 0, text: 'Clear 2 levels', goal: 2, ev: 'clear', reward: { coins: 60 } },
    { id: 'stars4', band: 0, text: 'Earn 4 stars', goal: 4, ev: 'stars', reward: { coins: 60 } },
    { id: 'steps20', band: 0, text: 'Make your echoes take 20 steps', goal: 20, ev: 'echoStep', reward: { coins: 60 } },
    { id: 'coins3', band: 0, text: 'Collect 3 coins inside levels', goal: 3, ev: 'coin', reward: { coins: 60 } },
    { id: 'spin1', band: 0, text: 'Spin the reward wheel', goal: 1, ev: 'spin', reward: { coins: 50 } },
    { id: 'perfect1', band: 1, text: 'Finish a level at par', goal: 1, ev: 'perfect', reward: { coins: 100 } },
    { id: 'gentle1', band: 1, text: 'Clear a level without any echo bumps', goal: 1, ev: 'gentle', reward: { coins: 100 } },
    { id: 'daily', band: 1, text: 'Clear the Daily Echo', goal: 1, ev: 'daily', reward: { coins: 100 } },
    { id: 'replay2', band: 1, text: 'Replay 2 levels you have cleared', goal: 2, ev: 'replay', reward: { coins: 90 } },
    { id: 'clean', band: 1, text: 'Clear a level with no hints and no undo', goal: 1, ev: 'clean', reward: { coins: 120 } },
    { id: 'stars12', band: 2, text: 'Earn 12 stars', goal: 12, ev: 'stars', reward: { coins: 150, chest: 'silver' } },
    { id: 'perfect2', band: 2, text: 'Finish 2 levels at par', goal: 2, ev: 'perfect', reward: { coins: 150 } },
    { id: 'boss', band: 2, text: 'Clear a boss level', goal: 1, ev: 'boss', reward: { coins: 150, chest: 'silver' } },
    { id: 'steps100', band: 2, text: 'Make your echoes take 100 steps', goal: 100, ev: 'echoStep', reward: { coins: 150 } },
    { id: 'favour2', band: 2, text: 'Use Favour twice', goal: 2, ev: 'favour', reward: { coins: 140 } },
    { id: 'gentle3', band: 2, text: 'Clear 3 levels with no echo bumps', goal: 3, ev: 'gentle', reward: { coins: 160, chest: 'silver' } },
  ];
  const qById = (id) => QUESTS.find((q) => q.id === id);
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  /* One easy, one medium and one hard quest per day, the same for everyone on that date. */
  function ensureQuests(prog, day) {
    if (prog.quests.day === day) return prog.quests;
    const list = [0, 1, 2].map((band) => { const pool = QUESTS.filter((q) => q.band === band); return { id: pool[hash(day + ':' + band) % pool.length].id, n: 0, claimed: false }; });
    prog.quests = { day, list, bonus: false };
    return prog.quests;
  }
  function questEvent(prog, day, ev, n) {
    ensureQuests(prog, day);
    const done = [];
    for (const q of prog.quests.list) {
      const def = qById(q.id);
      if (def.ev !== ev || q.n >= def.goal) continue;
      q.n = Math.min(def.goal, q.n + (n || 1));
      if (q.n >= def.goal) done.push(def);
    }
    return done;
  }
  function claimQuest(prog, day, id) {
    ensureQuests(prog, day);
    const q = prog.quests.list.find((x) => x.id === id), def = qById(id);
    if (!q || q.claimed || q.n < def.goal) return null;
    q.claimed = true;
    const out = { coins: earn(prog, def.reward.coins), chest: def.reward.chest || null, bonus: null };
    if (def.reward.chest) grantChest(prog, def.reward.chest, 'Quest: ' + def.text);
    if (!prog.quests.bonus && prog.quests.list.every((x) => x.claimed)) {
      prog.quests.bonus = true; addSpins(prog, 1); grantChest(prog, 'bronze', 'All daily quests');
      out.bonus = { spins: 1, chest: 'bronze' };
    }
    return out;
  }

  /* ---------- achievements (permanent, tiered) ---------- */
  const ACH = [
    { id: 'stargazer', name: 'Stargazer', stat: 'stars', tiers: [10, 30, 60, 100, 150, 200, 260, 330], unit: 'stars' },
    { id: 'perfectionist', name: 'Perfectionist', stat: 'perfect', tiers: [5, 15, 40, 70, 110], unit: 'levels at par' },
    { id: 'gentle', name: 'Gentle Soul', stat: 'gentle', tiers: [5, 20, 50, 100, 200], unit: 'clears with no echo bumps' },
    { id: 'walker', name: 'Echo Walker', stat: 'echoSteps', tiers: [100, 500, 2000, 5000, 20000], unit: 'echo steps' },
    { id: 'collector', name: 'Collector', stat: 'collection', tiers: [5, 15, 30, 60, 100, 150], unit: 'cosmetics owned' },
    { id: 'characters', name: 'Character Club', stat: 'own:face', tiers: [3, 10, 25, 50], unit: 'characters owned' },
    { id: 'orbs', name: 'Orb Hoarder', stat: 'own:orb', tiers: [3, 10, 25, 50], unit: 'orbs owned' },
    { id: 'trails', name: 'Trailblazer', stat: 'own:trail', tiers: [3, 10, 25, 50], unit: 'trails owned' },
    { id: 'portals', name: 'Gatekeeper', stat: 'own:portal', tiers: [3, 10, 25, 50], unit: 'portals owned' },
    { id: 'treasure', name: 'Treasure Hunter', stat: 'chests', tiers: [5, 25, 75, 200], unit: 'chests opened' },
    { id: 'spinner', name: 'Spin Doctor', stat: 'spins', tiers: [10, 50, 150, 400], unit: 'wheel spins' },
    { id: 'devoted', name: 'Devoted', stat: 'streak', tiers: [3, 7, 14, 30, 60], unit: 'day Daily streak' },
    { id: 'worlds', name: 'World Walker', stat: 'worlds', tiers: [1, 3, 6, 9, 11], unit: 'worlds cleared' },
    { id: 'fortune', name: 'Fortune', stat: 'coinsEarned', tiers: [5000, 25000, 100000, 300000, 1000000], unit: 'coins earned' },
  ];
  const ACH_COINS = [150, 300, 600, 1200, 2500, 5000, 8000, 12000];
  const ACH_CHEST = ['bronze', 'silver', 'silver', 'gold', 'gold', 'mythic', 'mythic', 'mythic'];
  function statOf(prog, levels, key) {
    if (key.startsWith('own:')) { const slot = key.slice(4); return Shop.CATALOG.filter((c) => c.slot === slot && !c.default && Shop.owns(prog, levels, c)).length; }
    return Shop.statValue(prog, levels, key);
  }
  function achState(prog, levels, a) {
    const claimed = prog.ach[a.id] || 0, have = statOf(prog, levels, a.stat), next = a.tiers[claimed];
    return { claimed, have, next, done: claimed >= a.tiers.length, claimable: next !== undefined && have >= next, reward: next !== undefined ? { coins: ACH_COINS[claimed], chest: ACH_CHEST[claimed] } : null };
  }
  function claimAch(prog, levels, id) {
    const a = ACH.find((x) => x.id === id), s = achState(prog, levels, a);
    if (!s.claimable) return null;
    prog.ach[id] = s.claimed + 1;
    earn(prog, s.reward.coins); grantChest(prog, s.reward.chest, 'Achievement: ' + a.name);
    if (s.claimed >= 1) addSpins(prog, 1);
    return { coins: s.reward.coins, chest: s.reward.chest, spin: s.claimed >= 1 };
  }
  const claimableCount = (prog, levels, day) => ACH.filter((a) => achState(prog, levels, a).claimable).length +
    ensureQuests(prog, day).list.filter((q) => !q.claimed && q.n >= qById(q.id).goal).length;

  /* ---------- chests ---------- */
  const CHESTS = {
    bronze: { name: 'Bronze chest', color: '#d08a4a', coins: [40, 90], boosts: 0, boostChance: 0.35, cos: 0, luck: 0.1 },
    silver: { name: 'Silver chest', color: '#cfd8ff', coins: [120, 260], boosts: 1, cos: 0.25, cosR: ['common', 'rare'], dup: 300 },
    gold: { name: 'Gold chest', color: '#ffc24b', coins: [350, 700], boosts: 2, cos: 0.6, cosR: ['rare', 'epic'], dup: 900, spin: 0.2 },
    mythic: { name: 'Mythic chest', color: '#ff5cf0', coins: [1200, 2500], boosts: 3, cos: 1, cosR: ['epic'], dup: 3000, spin: 1, luck: 0.5 },
  };
  const BOOSTS = [['hint', 2, 30], ['moves', 1, 30], ['luck', 1, 25], ['skip', 1, 15]];
  function grantChest(prog, tier, source) { prog.chestQueue.push({ tier, source: source || '' }); return tier; }
  function pickBoost(rng) { let r = rng() * 100; for (const b of BOOSTS) { if ((r -= b[2]) < 0) return b; } return BOOSTS[0]; }
  /* Open the oldest queued chest. Legendary items never drop: they keep their value. */
  function openChest(prog, levels, rng) {
    rng = rng || Math.random;
    const c = prog.chestQueue.shift(); if (!c) return null;
    const T = CHESTS[c.tier], out = { tier: c.tier, source: c.source, coins: rint(rng, T.coins[0], T.coins[1]), boosts: [], item: null, dup: 0, spin: false, luck: 0 };
    const nBoost = T.boosts || (rng() < T.boostChance ? 1 : 0);
    for (let i = 0; i < nBoost; i++) { const b = pickBoost(rng); prog.inv[b[0]] += b[1]; out.boosts.push({ kind: b[0], n: b[1] }); }
    if (T.cos && rng() < T.cos) {
      const pool = Shop.CATALOG.filter((it) => T.cosR.includes(it.rarity) && it.price && !it.gate && it.slot !== 'boost' && !Shop.owns(prog, levels, it));
      if (pool.length) { const it = pool[Math.floor(rng() * pool.length)]; prog.owned[it.id] = true; out.item = it; }
      else out.dup = T.dup;
    }
    if (T.spin && rng() < T.spin) { addSpins(prog, 1); out.spin = true; }
    if (T.luck && rng() < T.luck) out.luck = addLuck(prog, c.tier === 'mythic' ? 50 : 25);
    earn(prog, out.coins + out.dup);
    prog.stats.chests++;
    return out;
  }

  /* ---------- reward wheel ---------- */
  const SEGMENTS = [
    { k: 'coins', n: 60, label: '60', w: 26, color: '#4fe3ff' },
    { k: 'boost', b: 'hint', n: 2, label: '2 hints', w: 10, color: '#6dffb3' },
    { k: 'coins', n: 120, label: '120', w: 20, color: '#c49bff' },
    { k: 'chest', tier: 'bronze', label: 'Bronze', w: 12, color: '#d08a4a' },
    { k: 'coins', n: 250, label: '250', w: 12, color: '#ff9a5e' },
    { k: 'boost', b: 'moves', n: 1, label: '+3 moves', w: 10, color: '#5ec8ff' },
    { k: 'chest', tier: 'silver', label: 'Silver', w: 8, color: '#cfd8ff' },
    { k: 'coins', n: 2000, label: 'JACKPOT', w: 2, color: '#ffc24b', jackpot: true },
  ];
  const MAX_SPINS = 5;
  function addSpins(prog, n) { prog.wheel.spins = Math.min(MAX_SPINS, prog.wheel.spins + n); }
  const spinsAvailable = (prog, day) => (prog.wheel.freeDay !== day ? 1 : 0) + prog.wheel.spins;
  /* Pity: after 4 spins without a chest or the jackpot, the next spin is guaranteed one. */
  function spin(prog, day, rng) {
    rng = rng || Math.random;
    if (!spinsAvailable(prog, day)) return null;
    if (prog.wheel.freeDay !== day) prog.wheel.freeDay = day; else prog.wheel.spins--;
    const pity = prog.wheel.dry >= 4;
    const weights = SEGMENTS.map((s) => (pity ? (s.k === 'chest' ? (s.tier === 'bronze' ? 60 : 35) : s.jackpot ? 5 : 0) : s.w));
    let r = rng() * weights.reduce((a, b) => a + b, 0), idx = 0;
    for (; idx < SEGMENTS.length; idx++) { if ((r -= weights[idx]) < 0) break; }
    idx = Math.min(idx, SEGMENTS.length - 1);
    const seg = SEGMENTS[idx];
    if (seg.k === 'coins') earn(prog, seg.n);
    if (seg.k === 'boost') prog.inv[seg.b] += seg.n;
    if (seg.k === 'chest') grantChest(prog, seg.tier, 'Reward wheel');
    prog.wheel.dry = seg.k === 'chest' || seg.jackpot ? 0 : prog.wheel.dry + 1;
    if (seg.jackpot) prog.stats.jackpots++;
    prog.stats.spins++;
    const quests = questEvent(prog, day, 'spin', 1);
    return { idx, seg, pity, quests };
  }

  /* ---------- level clear bookkeeping: stats, luck, quests, chests ---------- */
  /* run = { level, stars, perfect, bumps, hasEchoes, usedHint, undos, first, daily, coinsTotal, steps, coins, favours } */
  function onClear(prog, levels, run, day) {
    const st = prog.stats, chests = [], quests = [];
    st.clears++;
    if (run.first) st.firstClears++;
    const gentle = run.hasEchoes && run.bumps === 0;
    if (gentle) { st.gentle++; addLuck(prog, LUCK.gentle); }
    st.coinsEarned += run.coinsTotal || 0;
    const q = (ev, n) => quests.push(...questEvent(prog, day, ev, n));
    q('clear', 1); q('stars', run.stars);
    if (run.perfect) q('perfect', 1);
    if (gentle) q('gentle', 1);
    if (!run.first) q('replay', 1);
    if (!run.usedHint && !run.undos) q('clean', 1);
    if (run.daily) q('daily', 1);
    if (run.level.id % 10 === 0) q('boss', 1);
    // counted on clear (net of undo) so they cannot be farmed by moving and undoing
    if (run.steps) q('echoStep', run.steps);
    if (run.coins) q('coin', run.coins);
    if (run.favours) q('favour', run.favours);
    // chests earned by this clear
    if (run.first && st.firstClears % 3 === 0) chests.push(grantChest(prog, 'bronze', 'Every 3rd new level'));
    if (run.first && run.level.id % 10 === 0) { chests.push(grantChest(prog, 'gold', 'Boss level cleared')); if (run.stars === 3) chests.push(grantChest(prog, 'silver', 'Boss level at par')); }
    if (run.first && Shop.worldCleared(prog, levels, run.level.world)) chests.push(grantChest(prog, 'mythic', 'World ' + run.level.world + ' cleared'));
    const stars = Shop.statValue(prog, levels, 'stars');
    while (Math.floor(stars / 10) > prog.starChests) { prog.starChests++; chests.push(grantChest(prog, 'silver', prog.starChests * 10 + ' stars')); }
    return { gentle, chests, quests };
  }
  function onDaily(prog, streak) {
    const out = { spin: true, chest: null };
    addSpins(prog, 1);
    if (streak && streak % 7 === 0) out.chest = grantChest(prog, 'gold', streak + '-day streak');
    return out;
  }

  /* Every way to earn coins right now (shown so there is always something to do). */
  function earnings(prog, levels, day) {
    ensureQuests(prog, day);
    const ds = P.dailyStatus(prog, day), di = P.dailyLevelIndex(prog, levels, day);
    return [
      { id: 'campaign', ok: P.nextLevelIndex(prog, levels) < levels.length && !(prog.levels[levels[levels.length - 1].id] || {}).clears, text: 'New levels pay the most (up to ' + Math.round(P.baseReward(levels[Math.min(levels.length - 1, P.nextLevelIndex(prog, levels))]) * 1.65) + ' coins).' },
      { id: 'daily', ok: di >= 0 && !ds.done, text: ds.done ? 'Daily Echo done; back tomorrow.' : di < 0 ? 'Clear level 1 to unlock the Daily Echo.' : 'Daily Echo: up to ' + (120 + 20 * Math.min(7, ds.streak)) + ' coins.' },
      { id: 'wheel', ok: spinsAvailable(prog, day) > 0, text: spinsAvailable(prog, day) ? spinsAvailable(prog, day) + ' wheel spin(s) ready.' : 'Next free wheel spin tomorrow.' },
      { id: 'quests', ok: prog.quests.list.some((q) => !q.claimed), text: prog.quests.list.filter((q) => !q.claimed).length + ' daily quest(s) left.' },
      { id: 'chests', ok: prog.chestQueue.length > 0, text: prog.chestQueue.length + ' chest(s) waiting to be opened.' },
      { id: 'ach', ok: ACH.some((a) => achState(prog, levels, a).claimable), text: 'Achievements pay up to 12,000 coins per tier.' },
      { id: 'replay', ok: true, text: 'Replays always pay something (at least ' + P.RULES.practicePay + ' coins at 2+ stars).' },
    ];
  }

  return { init, earn, LUCK, luckFromEvents, addLuck, luckFull, spendLuck, QUESTS, qById, ensureQuests, questEvent, claimQuest, ACH, achState, claimAch, claimableCount, CHESTS, grantChest, openChest, SEGMENTS, MAX_SPINS, addSpins, spinsAvailable, spin, onClear, onDaily, earnings };
});
