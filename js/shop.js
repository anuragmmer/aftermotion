/* Aftermotion unlocks: cosmetics (echo faces, orbs, trails, portals), boosts and milestone rewards.
 * Pure rules over the save data from progress.js; no DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./characters.js'));
  else root.AMShop = factory(root.AMChars);
})(typeof self !== 'undefined' ? self : this, function (Chars) {
  'use strict';

  const SLOTS = ['face', 'orb', 'trail', 'portal'];
  const DEFAULTS = { face: 'letter', orb: 'cyan', trail: 'glow', portal: 'classic' };
  // milestone: { world: n } all levels of world n cleared · { streak: n } best daily streak · { allStars: true }
  const CATALOG = [
    { id: 'letter', slot: 'face', name: 'Classic', desc: 'Each echo shows its kind\'s shape and letter.', default: true, rarity: 'common' },
    { id: 'cyan', slot: 'orb', name: 'Cyan', desc: 'The original glow.', default: true },
    { id: 'sunset', slot: 'orb', name: 'Sunset', desc: 'Warm orange and rose.', price: 350 },
    { id: 'plasma', slot: 'orb', name: 'Plasma', desc: 'Electric magenta.', price: 800 },
    { id: 'ghost', slot: 'orb', name: 'Ghost', desc: 'See-through, with a dashed rim.', milestone: { streak: 7 } },
    { id: 'goldorb', slot: 'orb', name: 'Gold', desc: 'Pure gold.', milestone: { world: 6 } },

    { id: 'glow', slot: 'trail', name: 'Glow', desc: 'Floors glow where you step.', default: true },
    { id: 'sparks', slot: 'trail', name: 'Sparks', desc: 'White sparks follow you.', milestone: { world: 2 } },
    { id: 'rainbow', slot: 'trail', name: 'Rainbow', desc: 'Every step a new colour.', price: 1000 },
    { id: 'embers', slot: 'trail', name: 'Embers', desc: 'Hot orange footsteps.', milestone: { world: 4 } },

    { id: 'classic', slot: 'portal', name: 'Classic', desc: 'Mint and cyan swirl.', default: true },
    { id: 'galaxy', slot: 'portal', name: 'Galaxy', desc: 'Violet, pink and blue.', price: 600 },
    { id: 'sunportal', slot: 'portal', name: 'Sunrise', desc: 'Gold and coral.', price: 600 },
    { id: 'void', slot: 'portal', name: 'Void', desc: 'A dark hole with a bright rim.', milestone: { world: 5 } },

    { id: 'hint3', slot: 'boost', boost: 'hint', qty: 3, name: 'Hint pack', desc: '3 hints. Each shows the next winning move from wherever you are.', price: 80 },
    { id: 'moves3', slot: 'boost', boost: 'moves', qty: 1, name: '+3 moves', desc: 'Adds 3 moves to a move-limited level. A boosted run earns at most 2 stars.', price: 60 },
    { id: 'luck', slot: 'boost', boost: 'luck', qty: 1, name: 'Lucky charm', desc: '+40 Luck at once on a level with coins, so Favour comes sooner.', price: 50 },
    { id: 'skip', slot: 'boost', boost: 'skip', qty: 1, name: 'Skip ticket', desc: 'Stuck? Unlock the next level without clearing this one. Come back for the stars later.', price: 250 },
  ];
  // Every character in the roster is a face item (the kind of echo is still shown by its badge).
  const BLURB = { common: 'A cheerful everyday echo.', rare: 'A rare echo with real personality.', epic: 'An epic echo. Turns heads.', legendary: 'Legendary. Few players ever see one.' };
  Chars.ROSTER.forEach((ch) => CATALOG.splice(1 + Chars.ROSTER.indexOf(ch), 0, Object.assign({ slot: 'face', desc: BLURB[ch.rarity] }, { id: ch.id, name: ch.name, rarity: ch.rarity, price: ch.price, milestone: ch.milestone, char: ch })));
  const byId = (id) => CATALOG.find((c) => c.id === id);

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
    const forSale = CATALOG.filter((c) => c.price && c.slot !== 'boost' && !owns(prog, levels, c)).sort((a, b) => a.price - b.price);
    if (forSale.length) { const it = forSale[0]; return { item: it, text: prog.coins >= it.price ? 'You can buy ' + it.name + ' now!' : (it.price - prog.coins) + ' coins to ' + it.name, ready: prog.coins >= it.price }; }
    const ms = CATALOG.find((c) => c.milestone && !owns(prog, levels, c));
    return ms ? { item: ms, text: milestoneText(ms) + ' to unlock ' + ms.name, ready: false } : null;
  }

  return { SLOTS, DEFAULTS, CATALOG, byId, init, owns, milestoneMet, milestoneText, worldCleared, buy, equip, useBoost, newUnlocks, nextGoal };
});
