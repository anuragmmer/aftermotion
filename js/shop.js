/* Aftermotion unlocks: cosmetics (echo faces, orbs, trails, portals), boosts and milestone rewards.
 * Pure rules over the save data from progress.js; no DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./characters.js'), require('./cosmetics.js'));
  else root.AMShop = factory(root.AMChars, root.AMCosmetics);
})(typeof self !== 'undefined' ? self : this, function (Chars, Cos) {
  'use strict';

  const SLOTS = ['face', 'orb', 'trail', 'portal'];
  const DEFAULTS = { face: 'letter', orb: 'cyan', trail: 'glow', portal: 'classic' };
  // milestone: { world: n } all levels of world n cleared · { streak: n } best daily streak · { allStars: true }
  const CATALOG = [
    { id: 'letter', slot: 'face', name: 'Classic', desc: 'Each echo shows its kind\'s shape and letter.', default: true, rarity: 'common' },
    { id: 'cyan', slot: 'orb', rarity: 'common', name: 'Cyan', desc: 'The original glow.', default: true },
    { id: 'mint', slot: 'orb', rarity: 'common', name: 'Mint', desc: 'Cool and fresh.', price: 150 },
    { id: 'ruby', slot: 'orb', rarity: 'common', name: 'Ruby', desc: 'A deep red gem.', price: 200 },
    { id: 'ocean', slot: 'orb', rarity: 'common', name: 'Ocean', desc: 'Blue like deep water.', price: 200 },
    { id: 'sunset', slot: 'orb', rarity: 'rare', name: 'Sunset', desc: 'Warm orange and rose.', price: 350 },
    { id: 'plasma', slot: 'orb', rarity: 'rare', name: 'Plasma', desc: 'Electric magenta.', price: 800 },
    { id: 'toxic', slot: 'orb', rarity: 'rare', name: 'Toxic', desc: 'Bubbling acid green.', price: 900 },
    { id: 'lava', slot: 'orb', rarity: 'epic', name: 'Lava', desc: 'Molten rock that churns as you move.', price: 1500 },
    { id: 'eclipse', slot: 'orb', rarity: 'epic', name: 'Eclipse', desc: 'A black sun with a burning corona.', price: 1800 },
    { id: 'ghost', slot: 'orb', rarity: 'epic', name: 'Ghost', desc: 'See-through, with a dashed rim.', milestone: { streak: 7 } },
    { id: 'goldorb', slot: 'orb', rarity: 'legendary', name: 'Gold', desc: 'Pure gold.', milestone: { world: 6 }, aura: 'gold' },
    { id: 'stormorb', slot: 'orb', rarity: 'legendary', name: 'Storm Core', desc: 'A crackling ball of lightning.', price: 4500, aura: 'storm' },
    { id: 'sunorb', slot: 'orb', rarity: 'legendary', name: 'Solar Flare', desc: 'A tiny sun with spinning flares.', price: 4000, aura: 'inferno' },
    { id: 'galaxyorb', slot: 'orb', rarity: 'legendary', name: 'Nebula', desc: 'A whole galaxy, slowly turning.', price: 4000, aura: 'cosmos' },
    { id: 'frostorb', slot: 'orb', rarity: 'legendary', name: 'Ice Heart', desc: 'A frozen crystal that sparkles.', price: 3500, aura: 'frost' },
    { id: 'prismorb', slot: 'orb', rarity: 'legendary', name: 'Prism', desc: 'Every colour at once.', price: 4000, aura: 'aurora' },

    { id: 'glow', slot: 'trail', rarity: 'common', name: 'Glow', desc: 'Floors glow where you step.', default: true },
    { id: 'fizz', slot: 'trail', rarity: 'common', name: 'Bubbles', desc: 'Every step pops bubbles.', price: 200 },
    { id: 'hearts', slot: 'trail', rarity: 'common', name: 'Hearts', desc: 'Leave a little love behind.', price: 300 },
    { id: 'pixels', slot: 'trail', rarity: 'rare', name: 'Pixels', desc: 'Retro pixel confetti.', price: 400 },
    { id: 'sparks', slot: 'trail', rarity: 'rare', name: 'Sparks', desc: 'White sparks follow you.', milestone: { world: 2 } },
    { id: 'frosttrail', slot: 'trail', rarity: 'rare', name: 'Frost', desc: 'Footsteps of fresh snow.', price: 600 },
    { id: 'petals', slot: 'trail', rarity: 'rare', name: 'Petals', desc: 'Blossoms swirl at your feet.', price: 700 },
    { id: 'embers', slot: 'trail', rarity: 'epic', name: 'Embers', desc: 'Hot orange footsteps.', milestone: { world: 4 } },
    { id: 'rainbow', slot: 'trail', rarity: 'epic', name: 'Rainbow', desc: 'Every step a new colour.', price: 1000 },
    { id: 'comet', slot: 'trail', rarity: 'epic', name: 'Comet', desc: 'A blazing comet tail.', price: 1500 },
    { id: 'shadow', slot: 'trail', rarity: 'epic', name: 'Shadow', desc: 'Smoke curls behind you.', price: 1800 },
    { id: 'lightning', slot: 'trail', rarity: 'legendary', name: 'Lightning', desc: 'Every step is a lightning bolt.', price: 4500, aura: 'storm' },
    { id: 'starfall', slot: 'trail', rarity: 'legendary', name: 'Starfall', desc: 'Stars burst from each step.', price: 4000, aura: 'cosmos' },
    { id: 'inferno', slot: 'trail', rarity: 'legendary', name: 'Inferno', desc: 'Walk on fire.', price: 4000, aura: 'inferno' },
    { id: 'matrixtrail', slot: 'trail', rarity: 'legendary', name: 'The Code', desc: 'You leave code where you walk.', price: 3500, aura: 'matrix' },

    { id: 'classic', slot: 'portal', rarity: 'common', name: 'Classic', desc: 'Mint and cyan swirl.', default: true },
    { id: 'emerald', slot: 'portal', rarity: 'common', name: 'Emerald', desc: 'A green gem whirl.', price: 200 },
    { id: 'rubyrift', slot: 'portal', rarity: 'common', name: 'Ruby Rift', desc: 'Red and hot pink.', price: 250 },
    { id: 'whirlpool', slot: 'portal', rarity: 'common', name: 'Whirlpool', desc: 'Deep blue water.', price: 300 },
    { id: 'galaxy', slot: 'portal', rarity: 'rare', name: 'Galaxy', desc: 'Violet, pink and blue.', price: 600 },
    { id: 'sunportal', slot: 'portal', rarity: 'rare', name: 'Sunrise', desc: 'Gold and coral.', price: 600 },
    { id: 'candy', slot: 'portal', rarity: 'rare', name: 'Candy', desc: 'A peppermint spiral.', price: 800 },
    { id: 'blackhole', slot: 'portal', rarity: 'epic', name: 'Black Hole', desc: 'A dark core with a burning ring.', price: 1600 },
    { id: 'void', slot: 'portal', rarity: 'epic', name: 'Void', desc: 'A dark hole with a bright rim.', milestone: { world: 5 } },
    { id: 'stormgate', slot: 'portal', rarity: 'legendary', name: 'Storm Gate', desc: 'A crackling ring of lightning.', price: 4500, aura: 'storm' },
    { id: 'infernogate', slot: 'portal', rarity: 'legendary', name: 'Inferno Gate', desc: 'A ring of fire.', price: 4000, aura: 'inferno' },
    { id: 'starfield', slot: 'portal', rarity: 'legendary', name: 'Warp Tunnel', desc: 'Fly through a tunnel of stars.', price: 4000, aura: 'cosmos' },
    { id: 'frostgate', slot: 'portal', rarity: 'legendary', name: 'Frost Gate', desc: 'An icy crystal ring.', price: 3500, aura: 'frost' },
    { id: 'cosmiceye', slot: 'portal', rarity: 'legendary', name: 'Cosmic Eye', desc: 'The portal watches you. Always.', price: 5000, aura: 'void' },

    { id: 'hint3', slot: 'boost', boost: 'hint', qty: 3, name: 'Hint pack', desc: '3 hints. Each shows the next winning move from wherever you are.', price: 80 },
    { id: 'moves3', slot: 'boost', boost: 'moves', qty: 1, name: '+3 moves', desc: 'Adds 3 moves to a move-limited level. A boosted run earns at most 2 stars.', price: 60 },
    { id: 'luck', slot: 'boost', boost: 'luck', qty: 1, name: 'Lucky charm', desc: '+40 Luck at once on a level with coins, so Favour comes sooner.', price: 50 },
    { id: 'skip', slot: 'boost', boost: 'skip', qty: 1, name: 'Skip ticket', desc: 'Stuck? Unlock the next level without clearing this one. Come back for the stars later.', price: 250 },
  ];
  // Every character in the roster is a face item (the kind of echo is still shown by its badge).
  const BLURB = { common: 'A cheerful everyday echo.', rare: 'A rare echo with real personality.', epic: 'An epic echo. Turns heads.', legendary: 'Legendary. Few players ever see one.' };
  Chars.ROSTER.forEach((ch) => CATALOG.splice(1 + Chars.ROSTER.indexOf(ch), 0, Object.assign({ slot: 'face', desc: ch.aura ? Chars.AURAS[ch.aura].desc : BLURB[ch.rarity] }, { id: ch.id, name: ch.name, rarity: ch.rarity, price: ch.price, milestone: ch.milestone, char: ch, aura: ch.aura })));
  // Generated orbs, trails and portals (50+ per category together with the hand-made ones).
  [Cos.ORBS, Cos.TRAILS, Cos.PORTALS].forEach((list) => list.forEach((it) => CATALOG.push(it)));

  /* ---------- pricing ---------- */
  // Rares and epics cost more than before so legendaries keep their place at the top.
  const round50 = (n) => Math.round(n / 50) * 50;
  CATALOG.forEach((it) => {
    if (!it.price || it.gen || it.slot === 'boost') return;
    if (it.rarity === 'rare' && it.slot === 'face') it.price = round50(it.price * 1.5);
    if (it.rarity === 'epic') it.price = round50(it.price * 2.5);
  });
  /* Legendary items: meet the requirement to qualify, then pay a very high price. */
  const LEGEND = {
    neonking: [{ stars: 200 }, 90000], stormcaller: [{ stars: 150 }, 60000], thunderskull: [{ stars: 120 }, 45000],
    phoenix: [{ perfect: 40 }, 55000], dragonemperor: [{ worlds: 8 }, 80000], frostbite: [{ gentle: 30 }, 50000],
    cosmo: [{ stars: 100 }, 40000], glitchcat: [{ chests: 40 }, 50000], kitsune: [{ streak: 14 }, 75000],
    sakura: [{ echoSteps: 3000 }, 35000], midnightdj: [{ spins: 60 }, 45000],
    stormorb: [{ stars: 120 }, 50000], sunorb: [{ perfect: 30 }, 40000], galaxyorb: [{ stars: 90 }, 35000],
    frostorb: [{ gentle: 20 }, 30000], prismorb: [{ collection: 60 }, 45000],
    lightning: [{ echoSteps: 5000 }, 55000], starfall: [{ stars: 100 }, 40000], inferno: [{ perfect: 50 }, 45000], matrixtrail: [{ chests: 30 }, 35000],
    stormgate: [{ worlds: 7 }, 60000], infernogate: [{ perfect: 60 }, 50000], starfield: [{ stars: 130 }, 45000],
    frostgate: [{ gentle: 40 }, 40000], cosmiceye: [{ achievements: 20 }, 70000],
  };
  Object.keys(LEGEND).forEach((id) => { const it = CATALOG.find((c) => c.id === id); if (it) { it.gate = LEGEND[id][0]; it.price = LEGEND[id][1]; } });

  const byId = (id) => CATALOG.find((c) => c.id === id);

  /* ---------- player stats used by gates, quests and achievements ---------- */
  const GATE_TEXT = {
    stars: (n) => 'Earn ' + n + ' stars', perfect: (n) => 'Finish ' + n + ' levels at par (3 stars)', gentle: (n) => 'Clear ' + n + ' levels with no echo bumps',
    echoSteps: (n) => 'Make your echoes take ' + n.toLocaleString('en-US') + ' steps', chests: (n) => 'Open ' + n + ' chests', spins: (n) => 'Spin the wheel ' + n + ' times',
    streak: (n) => 'Reach a ' + n + '-day Daily Echo streak', worlds: (n) => 'Clear ' + n + ' worlds', collection: (n) => 'Own ' + n + ' cosmetics',
    achievements: (n) => 'Claim ' + n + ' achievement tiers',
  };
  function statValue(prog, levels, key) {
    const st = prog.stats || {}, L = prog.levels || {};
    switch (key) {
      case 'stars': return Object.values(L).reduce((a, r) => a + (r.stars || 0), 0);
      case 'perfect': return Object.values(L).filter((r) => r.stars === 3).length;
      case 'worlds': { const ws = [...new Set(levels.map((l) => l.world))]; return ws.filter((w) => worldCleared(prog, levels, w)).length; }
      case 'collection': return CATALOG.filter((c) => c.slot !== 'boost' && !c.default && (prog.owned || {})[c.id]).length;
      case 'streak': return Math.max(prog.bestStreak || 0, (prog.daily && prog.daily.streak) || 0);
      case 'achievements': return Object.values(prog.ach || {}).reduce((a, n) => a + n, 0);
      default: return st[key] || 0;
    }
  }
  function gateStatus(prog, levels, gate) {
    if (!gate) return { met: true };
    const key = Object.keys(gate)[0], need = gate[key], have = statValue(prog, levels, key);
    return { met: have >= need, key, need, have, text: GATE_TEXT[key](need), progress: Math.min(1, have / need) };
  }

  function init(prog) {
    prog.owned = prog.owned || {};
    prog.equip = Object.assign({}, DEFAULTS, prog.equip || {});
    prog.inv = Object.assign({ hint: 0, moves: 0, luck: 0, skip: 0 }, prog.inv || {});
    prog.unlockSeen = prog.unlockSeen || {};
    return prog;
  }
  const cleared = (prog, l) => !!(prog.levels[l.id] && prog.levels[l.id].clears);
  function worldCleared(prog, levels, w) { const ls = levels.filter((l) => l.world === w); return ls.length > 0 && ls.every((l) => cleared(prog, l)); }
  function milestoneMet(prog, levels, item) {
    const m = item.milestone; if (!m) return false;
    if (m.world) return worldCleared(prog, levels, m.world);
    if (m.streak) return Math.max(prog.bestStreak || 0, (prog.daily && prog.daily.streak) || 0) >= m.streak;
    if (m.allStars) return levels.every((l) => prog.levels[l.id] && prog.levels[l.id].stars === 3);
    return false;
  }
  function milestoneText(item) {
    const m = item.milestone;
    return m.world ? 'Clear every level in World ' + m.world : m.streak ? 'Reach a ' + m.streak + '-day Daily Echo streak' : 'Get 3 stars on every level';
  }
  function owns(prog, levels, item) { return !!(item.default || prog.owned[item.id] || milestoneMet(prog, levels, item)); }

  function buy(prog, levels, id) {
    init(prog);
    const item = byId(id);
    if (!item || !item.price) return { ok: false, reason: 'Not for sale.' };
    const g = gateStatus(prog, levels, item.gate);
    if (!g.met) return { ok: false, reason: 'Locked: ' + g.text + ' (you have ' + g.have.toLocaleString('en-US') + ').' };
    if (item.slot !== 'boost' && owns(prog, levels, item)) return { ok: false, reason: 'Already yours.' };
    if (prog.coins < item.price) return { ok: false, reason: 'You need ' + (item.price - prog.coins) + ' more coins.' };
    prog.coins -= item.price;
    if (item.slot === 'boost') prog.inv[item.boost] += item.qty; else prog.owned[item.id] = true;
    return { ok: true };
  }
  function equip(prog, levels, id) {
    init(prog);
    const item = byId(id);
    if (!item || item.slot === 'boost' || !owns(prog, levels, item)) return false;
    prog.equip[item.slot] = id;
    return true;
  }
  function useBoost(prog, kind) { init(prog); if (!prog.inv[kind]) return false; prog.inv[kind]--; return true; }

  /* Milestone items that just became available (each reported once). */
  function newUnlocks(prog, levels) {
    init(prog);
    const out = [];
    for (const item of CATALOG) if (item.milestone && !prog.unlockSeen[item.id] && milestoneMet(prog, levels, item)) { prog.unlockSeen[item.id] = true; out.push(item); }
    return out;
  }
  /* The thing to look forward to: cheapest cosmetic still to buy, else the nearest milestone. */
  function nextGoal(prog, levels) {
    init(prog);
    const forSale = CATALOG.filter((c) => c.price && c.slot !== 'boost' && !c.gate && !owns(prog, levels, c)).sort((a, b) => a.price - b.price);
    if (forSale.length) { const it = forSale[0]; return { item: it, text: prog.coins >= it.price ? 'You can buy ' + it.name + ' now!' : (it.price - prog.coins) + ' coins to ' + it.name, ready: prog.coins >= it.price }; }
    const ms = CATALOG.find((c) => c.milestone && !owns(prog, levels, c));
    return ms ? { item: ms, text: milestoneText(ms) + ' to unlock ' + ms.name, ready: false } : null;
  }

  /* The active aura: the first equipped item (character, orb, trail, portal) that has one. */
  function activeAura(prog) {
    init(prog);
    for (const slot of SLOTS) { const it = byId(prog.equip[slot]); if (it && it.aura) return it.aura; }
    return null;
  }

  return { statValue, gateStatus, GATE_TEXT, activeAura, AURAS: Chars.AURAS, SLOTS, DEFAULTS, CATALOG, byId, init, owns, milestoneMet, milestoneText, worldCleared, buy, equip, useBoost, newUnlocks, nextGoal };
});
