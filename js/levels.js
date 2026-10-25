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
      intro: 'Move with the arrow keys, WASD, or by swiping. Reach the spinning portal.',
      plan: 'Follow the corridor right, then down into the portal.',
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
      intro: 'Meet Trace, your first echo. Trace does not follow you step by step. It collects your moves in groups of 4, then takes ONE step: the direction of the first move in the group.',
      plan: 'Trace is 2 tiles left of the portal, so it needs to step right twice. Make your 1st and 5th moves right. Your other moves can go anywhere, but finish on the portal yourself.',
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
      intro: 'A door opens while something stands on its plate. You cannot stand on the plate and walk through the door at the same time, so Trace has to hold it for you.',
      plan: 'Get Trace onto plate a: it needs one step up and one step right, so make those the first moves of two groups. On the plate there is a wall to Trace\'s right, so if every later group starts with a right move, Trace bumps the wall and stays put. Then walk through door A.',
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
      intro: 'Crates can be pushed but never pulled. A crate on a plate holds its door open.',
      plan: 'Walk round to the tile above the crate and push it down onto plate a. Do not push it right, or it gets stuck against the wall.',
      map: [
        '###########',
        '#.....#...#',
        '#P..o..A.X#',
        '####a######',
      ],
    },
    {
      id: 5, name: 'Lucky Streak', par: 10, mode: 'together', required: [1], luck0: 60, maxMoves: 14,
      intro: 'Coins fill your Luck meter. At 100 Luck, press Favour (F): echoes then use groups of 2 instead of 4 for a while, so they move twice as often.',
      plan: 'Trace needs 4 steps right to reach the portal, and you only have 14 moves. Grab both coins first, press Favour, then make the first move of every group a right move.',
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
      intro: 'Keeper never walks. Every 3 moves it sends a small helper to the nearest free plate. The helper holds the plate for 6 moves, then disappears.',
      plan: 'Keeper acts after your 3rd move, and its helper needs 2 more moves to reach plate a. Walk toward door A meanwhile; once the door opens, go straight through to the portal.',
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
      intro: 'Mason never walks either. When a group of moves is complete, Mason builds a block on the tile next to it, in the direction of the group\'s first move.',
      plan: 'Plate a is to the right of Mason, so make your very first move right. Mason builds on the plate after move 4, which opens door A for 8 moves. Be through the door by then.',
      map: [
        '###########',
        '#P...A...X#',
        '#####Ma####',
        '###########',
      ],
    },
    {
      id: 8, name: 'Interference', par: 12, mode: 'through', maxMoves: 14,
      intro: 'The Blocker is hostile. It marks a tile with a red square and a countdown, then drops a block there that lasts 6 moves.',
      plan: 'The red square appears ahead of you on the top corridor. If the block lands in your way, drop down and use the lower corridor.',
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
      intro: 'Flicker groups moves in 2s. It can also hop: press H, then tap a green tile up to 3 steps away. It sits there for 4 moves (holding a plate if it lands on one), then jumps back. One hop per level.',
      plan: 'Plate a is walled off, but Flicker can hop onto it. Walk to the tile just left of door A, then hop Flicker onto plate a and walk through the door while it holds.',
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
      intro: 'Everything at once: Trace has to reach the portal too, but door A is in its way. Keeper can open that door for you, and the Blocker will try to interfere.',
      plan: 'Keeper\'s helper holds plate a for 6 moves at a time. Time Trace\'s right steps so it walks through door A while the door is open. A door also stays open while anything stands in its doorway.',
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
