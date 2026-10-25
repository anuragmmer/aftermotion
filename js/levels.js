/* Handcrafted levels. Map legend:
 *  # wall   . floor   P player   X exit   o push block   c coin   * fragment
 *  a-d pressure plates   A-D doors (open while the same-letter plate is held)
 *  T Trace  F Flicker  M Mason  K Keeper (echo starts)   Z Blocker enemy
 * Echo ids are assigned in reading order (row by row). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AMLevels = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return [
    {
      id: 1, name: 'First Steps', par: 8, mode: 'through',
      intro: 'Move with the arrow keys or WASD. Reach the glowing exit. R restarts, Z undoes.',
      map: [
        '#########',
        '#P......#',
        '#.#####.#',
        '#.....#X#',
        '#########',
      ],
    },
    {
      id: 2, name: 'Echo of the First', par: 8, mode: 'together', required: [1],
      intro: 'Trace acts once per 4 of your moves, and only copies the FIRST direction of each batch. Bring Trace and yourself to the exit.',
      map: [
        '#########',
        '#.......#',
        '#.T.X...#',
        '#P......#',
        '#########',
      ],
    },
    {
      id: 3, name: 'Hold the Door', par: 12, mode: 'through',
      intro: 'A pressure plate is active only while something stands on it. Let Trace hold it while you pass the door. A move into a wall is blocked, so Trace can wait.',
      map: [
        '###########',
        '#....#....#',
        '#.P..A..X.#',
        '#....#....#',
        '###.a######',
        '###T.######',
        '###########',
      ],
    },
    {
      id: 4, name: 'Weight', par: 10, mode: 'through',
      intro: 'Push blocks (never pull!). A block on a plate holds the door open. Undo with Z if you jam one.',
      map: [
        '###########',
        '#.....#...#',
        '#P..o..A.X#',
        '####a######',
      ],
    },
    {
      id: 5, name: 'Lucky Streak', par: 10, mode: 'together', required: [1], luck0: 60, maxMoves: 14,
      intro: 'Collect coins to fill the Luck meter, then press F for Favour: echoes act more often (batch 4 → 2) from their next batch. Cooldown follows.',
      map: [
        '###########',
        '#T...X....#',
        '#.c.c.....#',
        '#P........#',
        '###########',
      ],
    },
    {
      id: 6, name: 'Helping Hand', par: 10, mode: 'through', maxMoves: 16,
      intro: 'Keeper does not walk: every 3 moves it sends a helper to the nearest free plate. The helper holds the plate for a limited time, so be quick.',
      map: [
        '############',
        '#K.a########',
        '#.##########',
        '#P....A..X.#',
        '############',
      ],
    },
    {
      id: 7, name: 'Borrowed Bridge', par: 10, mode: 'through', maxMoves: 14,
      intro: 'Mason builds a temporary block on the tile its batch head points at. A block on a plate holds the door, until it expires.',
      map: [
        '###########',
        '#P...A...X#',
        '#####Ma####',
        '###########',
      ],
    },
    {
      id: 8, name: 'Interference', par: 12, mode: 'through', maxMoves: 14,
      intro: 'The Blocker telegraphs a target tile (red dashes + countdown) then drops a corruption block there. Read it and route around.',
      map: [
        '###########',
        '#P........#',
        '#.###.###.#',
        '#.#.....#X#',
        '#.....Z...#',
        '###########',
      ],
    },
    {
      id: 9, name: 'Short Hop', par: 6, mode: 'through', maxMoves: 14,
      intro: 'Press H, then click a tile within 3 steps: Flicker hops there (even over walls), holds it for 4 moves, then returns. One hop per level.',
      map: [
        '###########',
        '#.F#a######',
        '#..########',
        '#P...A.X###',
        '###########',
      ],
    },
    {
      id: 10, name: 'Together Again', par: 17, mode: 'together', required: [2], maxMoves: 24,
      intro: 'Everything at once: Trace must reach the exit, but a door blocks its way. Keeper can hold the plate; the Blocker will interfere. Plan the batches.',
      map: [
        '#############',
        '#K.a#########',
        '#.###########',
        '#P..T.A.X.Z.#',
        '#############',
      ],
    },
  ];
});
