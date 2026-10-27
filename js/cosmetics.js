/* Aftermotion generated cosmetics: orbs, trails and portals built from named palettes and visual
 * styles, so each category has 50+ distinct items. Each generated item renders from CSS custom
 * properties (--c1/--c2/--c3) plus a style class; the hand-made legendaries stay class-based. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AMCosmetics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PALETTES = [
    ['Coral', '#ff7a6b', '#ffd1c4', '#c2413a'], ['Lagoon', '#2ec4b6', '#cbf3f0', '#147a72'], ['Lilac', '#c49bff', '#f0e6ff', '#6a3bd6'],
    ['Citrus', '#ffd23f', '#fff4c2', '#e09f00'], ['Berry', '#d6336c', '#ffc2d6', '#7a0f3a'], ['Moss', '#7bbf3a', '#e2f5c9', '#3e6b14'],
    ['Sky', '#5ec8ff', '#e0f6ff', '#1f6fb8'], ['Peach', '#ffab76', '#ffe3d1', '#c96530'], ['Spearmint', '#3ddc97', '#d6fff0', '#137a50'],
    ['Plum', '#8e44ad', '#e8d4f2', '#4a1563'], ['Rose', '#ff6f91', '#ffe0e8', '#b8304f'], ['Dune', '#e8c07d', '#fff2d9', '#9a7330'],
    ['Steel', '#8fa3bf', '#e6edf7', '#475569'], ['Lime', '#b6ff3b', '#f1ffd6', '#5a9a00'], ['Magma', '#ff4d00', '#ffb000', '#5c1400'],
    ['Glacier', '#9ee8ff', '#ffffff', '#3a8fb8'], ['Midnight', '#3b3f99', '#a8b0ff', '#14164a'], ['Bubblegum', '#ff8fd8', '#ffe0f6', '#c2459a'],
    ['Jade', '#00a878', '#b8f2de', '#00573e'], ['Amber', '#ffb000', '#ffe08a', '#995e00'], ['Cobalt', '#2f5bff', '#c9d6ff', '#14287a'],
    ['Crimson', '#e5173f', '#ffb3c1', '#6b0016'], ['Teal', '#0fb5ae', '#c4f5f2', '#08605c'], ['Ash', '#9e9e9e', '#f2f2f2', '#4a4a4a'],
    ['Ultraviolet', '#7b2fff', '#d9c4ff', '#3a0f8a'], ['Tangerine', '#ff8c1a', '#ffd8b0', '#a34d00'], ['Pearl', '#7fd6ff', '#ffffff', '#2a6f97'],
    ['Cocoa', '#a0673f', '#f0d6c2', '#5a3215'], ['Blossom', '#ffb3d1', '#fff0f6', '#d16a96'], ['Voltage', '#00e5ff', '#e0fdff', '#0062ff'],
  ];
  const RARITY_OF = {
    orb: { gem: 'common', glass: 'common', split: 'common', dotted: 'common', banded: 'rare', pulse: 'rare', swirl: 'epic', ringed: 'epic' },
    trail: { circle: 'common', square: 'common', ring: 'common', star: 'rare', heart: 'rare', diamond: 'rare', drop: 'rare', moon: 'epic', note: 'epic', flower: 'epic', bolt: 'epic', cross: 'common' },
    portal: { swirl: 'common', split: 'common', stripes: 'rare', rings: 'rare', spiral: 'epic', nebula: 'epic', pulse: 'epic' },
  };
  const NOUN = {
    orb: { gem: 'Gem', glass: 'Glass', split: 'Duo', dotted: 'Speckle', banded: 'Bands', pulse: 'Pulse', swirl: 'Swirl', ringed: 'Ring' },
    trail: { circle: 'Drops', square: 'Blocks', ring: 'Rings', star: 'Stars', heart: 'Hearts', diamond: 'Gems', drop: 'Rain', moon: 'Moons', note: 'Notes', flower: 'Flowers', bolt: 'Zaps', cross: 'Crosses' },
    portal: { swirl: 'Swirl', split: 'Rift', stripes: 'Spiral', rings: 'Ripple', spiral: 'Vortex', nebula: 'Nebula', pulse: 'Halo' },
  };
  const BURST_OF = { circle: 'sparks', square: 'pixels', ring: 'bubbles', star: 'stars', heart: 'hearts', diamond: 'sparks', drop: 'bubbles', moon: 'stars', note: 'sparks', flower: 'petals', bolt: 'sparks', cross: 'pixels' };
  const PRICE = {
    common: (i) => 150 + (i % 10) * 50,      // 150 .. 600
    rare: (i) => 800 + (i % 9) * 200,         // 800 .. 2400
    epic: (i) => 3000 + (i % 11) * 500,       // 3000 .. 8000
  };

  /* Every (palette, style) pair, in a fixed pseudo-random order (seeded shuffle), so the set is
     stable across releases and no two items look alike. */
  function generate(slot, count, seed, prefix) {
    const styles = Object.keys(RARITY_OF[slot]), pairs = [];
    PALETTES.forEach((pal) => styles.forEach((style) => pairs.push([pal, style])));
    let x = seed >>> 0;
    const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
    const per = {};
    return pairs.slice(0, count).map(([pal, style]) => {
      const rarity = RARITY_OF[slot][style], n = (per[rarity] = (per[rarity] || 0) + 1) - 1;
      return {
        id: prefix + '-' + pal[0].toLowerCase() + '-' + style, slot, rarity, price: PRICE[rarity](n),
        name: pal[0] + ' ' + NOUN[slot][style], desc: describe(slot, style, pal[0]),
        gen: { style, c1: pal[1], c2: pal[2], c3: pal[3] },
        burst: slot === 'trail' ? BURST_OF[style] : undefined,
      };
    });
  }
  function describe(slot, style, pal) {
    const D = {
      orb: { gem: 'A polished %s gem.', glass: 'Clear %s glass.', split: 'Half and half, in %s tones.', dotted: 'Speckled with %s light.', banded: 'Striped bands of %s.', pulse: 'Breathes a %s glow.', swirl: 'A slowly turning %s swirl.', ringed: 'A %s core with an orbiting ring.' },
      trail: { circle: '%s droplets mark each step.', square: 'Chunky %s blocks.', ring: 'Little %s rings ripple out.', star: '%s stars sparkle behind you.', heart: '%s hearts float up.', diamond: 'Tiny %s gems.', drop: '%s raindrops.', moon: 'Crescent %s moons.', note: '%s music notes.', flower: '%s flowers bloom where you step.', bolt: 'Small %s zaps.', cross: '%s crosses.' },
      portal: { swirl: 'A %s swirl.', split: 'A %s rift split in two.', stripes: 'Candy-striped %s spiral.', rings: '%s ripples pulse outward.', spiral: 'A fast %s vortex.', nebula: 'A %s nebula drifting inside.', pulse: 'A glowing %s halo.' },
    };
    return D[slot][style].replace('%s', pal);
  }
  /* Animated trails: a separate batch (own id prefix) so the static set above never reshuffles.
     Each one moves continuously on the board and draws a glowing ribbon between tiles. */
  const ANIM = {
    spinstar: ['rare', 'Spinners', 'Spinning %s stars.', 'stars'], ripple: ['rare', 'Ripples', '%s rings that keep rippling outward.', 'bubbles'],
    heartbeat: ['rare', 'Heartbeat', 'Beating %s hearts.', 'hearts'], twinkle: ['rare', 'Twinkle', '%s sparkles that flash on and off.', 'sparks'],
    orbit: ['epic', 'Orbit', 'Every step leaves a %s moon with two satellites circling it.', 'stars'], helix: ['epic', 'Helix', 'Two %s sparks spiral around each other.', 'sparks'],
    prism: ['epic', 'Prism', 'A spinning %s prism that shifts colour.', 'confetti'], flame: ['epic', 'Wisp', 'Flickering %s spirit flames.', 'embers'],
  };
  function generateAnim(count, seed) {
    const pairs = [], styles = Object.keys(ANIM);
    PALETTES.forEach((pal) => styles.forEach((st) => pairs.push([pal, st])));
    let x = seed >>> 0;
    const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
    // two of each style, so every animation is represented
    const per = {}, out = [];
    for (const [pal, st] of pairs) {
      if ((per[st] || 0) >= count / styles.length) continue;
      per[st] = (per[st] || 0) + 1;
      const A = ANIM[st], n = out.filter((o) => o.rarity === A[0]).length;
      out.push({ id: 'ta-' + pal[0].toLowerCase() + '-' + st, slot: 'trail', rarity: A[0], price: A[0] === 'rare' ? 2600 + (n % 6) * 300 : 5500 + (n % 8) * 500,
        name: pal[0] + ' ' + A[1], desc: A[2].replace('%s', pal[0]) + ' Animated.', gen: { style: st, c1: pal[1], c2: pal[2], c3: pal[3], anim: true }, burst: A[3] });
      if (out.length >= count) break;
    }
    return out;
  }
  const ORBS = generate('orb', 40, 7, 'og');
  const TRAILS = generate('trail', 40, 11, 'tg').concat(generateAnim(16, 23));
  const PORTALS = generate('portal', 40, 13, 'pg');

  const vars = (g) => '--c1:' + g.c1 + ';--c2:' + g.c2 + ';--c3:' + g.c3;
  return { PALETTES, ORBS, TRAILS, PORTALS, vars };
});
