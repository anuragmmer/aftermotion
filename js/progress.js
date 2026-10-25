/* Aftermotion progression & economy (design spec v0.2 §9).
 * Pure reward rules + best-effort localStorage persistence. No DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AMProgress = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = 'aftermotion.v2';
  const RULES = {
    starMult: [0, 1, 1.25, 1.5],
    noHintBonus: 0.1,
    coinValue: 5,            // coins per in-level coin, first clear only
    replayDecay: 0.5,        // 50%, 25%, 12.5% …
    paidReplays: 3,          // paid replays before the counter must regenerate
    lifetimeReplays: 10,
    regenMs: 8 * 3600 * 1000,
    hintCost: 30,
  };

  const baseReward = (level) => 20 + 6 * (level.id - 1);
  function starsFor(moves, par) {
    if (!par) return 3;
    if (moves <= par) return 3;
    if (moves <= Math.ceil(par * 1.25)) return 2;
    return 1;
  }
  const twoStarLimit = (par) => Math.ceil(par * 1.25);

  function defaults() {
    return { v: 2, coins: 0, levels: {}, seen: {}, sound: true, reduceMotion: false, freeHintDay: '', introDone: false };
  }
  function record(prog, id) {
    return prog.levels[id] || (prog.levels[id] = { stars: 0, best: null, clears: 0, k: 0, life: 0, lastPaid: 0 });
  }
  function regen(rec, now) {
    if (rec.k > 0 && rec.lastPaid) {
      const steps = Math.floor((now - rec.lastPaid) / RULES.regenMs);
      if (steps > 0) { rec.k = Math.max(0, rec.k - steps); rec.lastPaid += steps * RULES.regenMs; }
    }
  }

  /* Apply a completed run. result = {moves, collected, usedHint}. Mutates prog; returns a receipt. */
  function applyClear(prog, level, result, now) {
    const rec = record(prog, level.id);
    regen(rec, now);
    const base = baseReward(level), stars = starsFor(result.moves, level.par);
    const mult = RULES.starMult[stars], lines = [];
    let total = 0;
    const add = (label, value, tone) => { lines.push({ label, value, tone: tone || '' }); total += value; };
    const first = rec.clears === 0;
    if (first) {
      add('First clear', base);
      if (stars > 1) add(stars + '-star bonus (×' + mult + ')', Math.round(base * (mult - 1)), 'gold');
      if (!result.usedHint) add('No hints (+10%)', Math.round(base * mult * RULES.noHintBonus), 'good');
      if (result.collected) add('Coins collected', result.collected * RULES.coinValue);
    } else {
      if (stars > rec.stars) add('Star upgrade', Math.round(base * (RULES.starMult[stars] - RULES.starMult[rec.stars])), 'gold');
      if (rec.life >= RULES.lifetimeReplays) add('Replay reward (lifetime cap reached)', 0, 'dim');
      else if (rec.k >= RULES.paidReplays) add('Replay reward (recharging)', 0, 'dim');
      else if (stars < 2) add('Replay reward (needs ★★)', 0, 'dim');
      else {
        const pct = Math.pow(RULES.replayDecay, rec.k + 1);
        add('Replay reward (' + Math.round(pct * 1000) / 10 + '%)', Math.round(base * mult * pct));
        rec.k++; rec.life++; rec.lastPaid = now;
      }
    }
    const newBest = rec.best === null || result.moves < rec.best;
    rec.best = newBest ? result.moves : rec.best;
    rec.stars = Math.max(rec.stars, stars);
    rec.clears++;
    prog.coins += total;
    return { lines, total, stars, first, newBest, best: rec.best, next: nextReplayInfo(rec, now) };
  }

  function nextReplayInfo(rec, now) {
    regen(rec, now);
    if (rec.life >= RULES.lifetimeReplays) return 'Replays no longer pay coins on this level, but stars still count.';
    if (rec.k >= RULES.paidReplays) {
      const ms = RULES.regenMs - (now - rec.lastPaid), h = Math.max(1, Math.ceil(ms / 3600000));
      return 'Replay rewards recharge in about ' + h + ' h.';
    }
    return 'Next replay pays ' + Math.round(Math.pow(RULES.replayDecay, rec.k + 1) * 1000) / 10 + '% (★★ or better). ' + (RULES.paidReplays - rec.k) + ' paid replays left.';
  }

  const isUnlocked = (prog, levels, idx) => idx === 0 || !!(prog.levels[levels[idx - 1].id] && prog.levels[levels[idx - 1].id].clears);
  const totalStars = (prog) => Object.values(prog.levels).reduce((s, r) => s + (r.stars || 0), 0);
  function nextLevelIndex(prog, levels) {
    for (let i = 0; i < levels.length; i++) if (!(prog.levels[levels[i].id] && prog.levels[levels[i].id].clears)) return i;
    return levels.length - 1;
  }

  /* Hints: one free per day, then coins. Returns {ok, free, cost}. */
  function chargeHint(prog, today) {
    if (prog.freeHintDay !== today) { prog.freeHintDay = today; return { ok: true, free: true, cost: 0 }; }
    if (prog.coins < RULES.hintCost) return { ok: false, free: false, cost: RULES.hintCost };
    prog.coins -= RULES.hintCost;
    return { ok: true, free: false, cost: RULES.hintCost };
  }
  const hintPrice = (prog, today) => (prog.freeHintDay !== today ? 0 : RULES.hintCost);

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      return raw && raw.v === 2 ? Object.assign(defaults(), raw) : defaults();
    } catch (e) { return defaults(); }
  }
  function save(prog) { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) { /* storage unavailable */ } }

  return { RULES, baseReward, starsFor, twoStarLimit, defaults, record, applyClear, nextReplayInfo, isUnlocked, totalStars, nextLevelIndex, chargeHint, hintPrice, load, save };
});
