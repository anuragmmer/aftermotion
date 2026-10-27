/* Aftermotion demo clips: tiny scripted boards that play on the intro card the first time a level
 * introduces a mechanic. Each script is replayed through the real engine (tools/test.js checks
 * that every demo does what its captions say). Moves use the solution syntax: U R D L, F, Hx,y; */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AMDemos = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DEMOS = {
    trace: {
      title: 'Echo copies slot 1 of every 4',
      map: ['########', '#T.....#', '#......#', '#P....X#', '########'],
      moves: 'RUDRRLRR',
      caps: { 0: 'Watch Echo\'s tape (4 slots) and the ring.', 1: 'Your first move, →, lands in slot 1.', 2: 'Slots 2, 3 and 4 are ignored…', 4: 'Group full: Echo copies slot 1 and steps →.', 5: 'A new group starts. Slot 1 is → again.', 8: 'Echo steps → again. Only slot 1 ever counts.' },
      expect: { echo: [3, 1] },
    },
    plate: {
      title: 'Plates hold doors open',
      map: ['#######', '#Ta.#.#', '#...A.#', '#P..#X#', '#######'],
      moves: 'RURLRRRD',
      caps: { 0: 'Door A only opens while something stands on plate a.', 1: 'Slot 1 is →, toward the plate.', 4: 'Echo steps onto plate a: door A opens!', 5: 'Walk through while Echo holds the plate.', 8: 'Through the door and into the portal.' },
      expect: { won: true },
    },
    crate: {
      title: 'Push crates onto plates',
      map: ['#######', '#.....#', '#Po.a.#', '#...#A#', '#...#X#', '#######'],
      moves: 'RRURRDDD',
      caps: { 0: 'Walk into a crate to push it. You can never pull it back.', 1: 'Push…', 2: 'The crate lands on plate a: door A opens.', 4: 'A crate holds a plate for good, unlike an echo.', 8: 'Into the portal.' },
      expect: { won: true },
    },
    coin: {
      title: 'Coins fill Luck, Luck buys Favour',
      map: ['#########', '#T......#', '#.......#', '#Pcccc.X#', '#########'], luck0: 20,
      moves: 'RRRRFRLRL',
      caps: { 0: 'Each coin adds 20 Luck. At 100 you can press Favour.', 2: 'Coin! The Favour ring fills.', 4: 'Luck 100: Favour is ready.', 5: 'Favour! Echo now uses groups of 2: twice as fast.', 7: 'Echo stepped after just 2 moves.', 9: 'And again. Favour lasts 10 moves.' },
      expect: { favoured: true },
    },
    keeper: {
      title: 'Keeper sends helpers to plates',
      map: ['########', '#K....a#', '#......#', '#P...#A#', '#....#X#', '########'],
      moves: 'RLRLRLRL',
      caps: { 0: 'Keeper never walks. Every 3 moves it sends a helper.', 3: 'A helper sets off toward the nearest free plate.', 6: 'The helper walks there on its own…', 8: 'It holds the plate, so door A is open for 6 moves.' },
      expect: { helper: true },
    },
    mason: {
      title: 'Mason builds where slot 1 points',
      map: ['#######', '#.....#', '#.M...#', '#.....#', '#P...X#', '#######'],
      moves: 'RLRLUDUD',
      caps: { 0: 'Mason never walks. It builds a block next to itself.', 1: 'Slot 1 is →…', 4: '…so Mason builds a block to its right.', 5: 'New group, slot 1 is ↑.', 8: 'A block above it. Blocks hold plates and fade after a while.' },
      expect: { blocks: 2 },
    },
    blocker: {
      title: 'The Blocker drops blocks',
      map: ['#########', '#......X#', '#.......#', '#P.....Z#', '#########'],
      moves: 'RRRULLLDRRR',
      caps: { 0: 'The pink Blocker is hostile.', 2: 'It marks a tile in red and counts down.', 4: 'When the count hits zero, a block drops there.', 7: 'Corruption blocks fade after 6 moves.' },
      expect: { corruption: true },
    },
    flicker: {
      title: 'Flicker: groups of 2, and it can hop',
      map: ['########', '#F..#..#', '#...#..#', '#P....X#', '########'],
      moves: 'RLRLH5,1;RLRL',
      caps: { 0: 'Flicker\'s tape has only 2 slots, so it copies every other move.', 1: 'Slot 1 is →…', 2: '…and Flicker steps → already.', 5: 'Hop (H): Flicker jumps to a chosen tile, even over a wall.', 7: 'It stays there for 4 moves…', 9: '…then jumps back.' },
      expect: { hopped: true },
    },
    powered: {
      title: 'Powered portals',
      map: ['#######', '#T.a..#', '#.....#', '#.P..X#', '#######'],
      exitLock: ['A'],
      moves: 'RUDLRUDLRRR',
      caps: { 0: 'A powered portal stays dark until its plate is held.', 4: 'Echo heads for plate a…', 8: '…the plate is held: the portal lights up.', 11: 'Now the portal lets you through.' },
      expect: { won: true },
    },
  };
  // first level that introduces each mechanic gets its clip
  const FIRST = { 2: 'trace', 3: 'plate', 4: 'crate', 5: 'coin', 6: 'keeper', 7: 'mason', 8: 'blocker', 9: 'flicker', 17: 'powered' };
  const tokens = (m) => m.match(/H\d+,\d+;|[URDLF]/g) || [];
  return { DEMOS, FIRST, tokens };
});
