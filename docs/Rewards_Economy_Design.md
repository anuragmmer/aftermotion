# Aftermotion · Rewards & Economy Design

This document describes every reward system in the game: what each one is for, its states and
motion, the exact algorithm and numbers, what triggers it, and how it shows up in the UI. The
numbers live in code; the file to change is named in each section.

## 1. Goals

1. **There is always a way to earn coins.** Campaign, replays, Daily Echo, quests, quiz, wheel,
   garden, calendar, chests and achievements all pay, so a player never hits a dead end.
2. **Daily rhythm without punishment.** Daily systems reset at 00:00 UTC. Missing a day costs only
   that day's rewards: the gift calendar never resets, and streak bonuses cap at 7 days.
3. **Legendary items keep their value.** They cannot drop from chests, the wheel or try-on
   discounts. Each needs a **milestone** (stars, perfect levels, gentle clears and so on) and then a
   very high coin price (30,000–90,000).
4. **Play well, earn more.** Stars multiply rewards, gentle echo handling fills Clover, perfect quiz
   days and boss clears drop bigger chests.
5. **Every locked thing says why and how to unlock it** (§12).

## 2. Coin sources at a glance

| Source | Where | Typical pay | Limit | Code |
|---|---|---|---|---|
| First clear | Level | `(20 + 6·(id−1)) × stars mult (1 / 1.25 / 1.5)` + 10% no-hint + 5 per coin | once per level | `progress.js` |
| Replay | Level | 50% → 25% → 12.5% of base | 3 paid per 8 h, 10 lifetime | `progress.js` |
| Practice pay | Level | 5 at 2+ stars | 20 per day | `progress.js` |
| Daily Echo | Title | `60 + 20·min(streak,7)`, ×2 at par without a hint | 1 per day | `progress.js` |
| Daily quests | Rewards → Quests | 50–160 each, Silver chest on hard ones | 3 per day + bonus | `rewards.js` |
| Echo Quiz | Rewards → Quiz | 20 / 30 / 45 / 60 / 80, +100 for 5/5 | 5 per day | `extras.js` |
| Reward wheel | Rewards → Wheel | 60–2,000 (EV ≈ 110 coins + items) | 1 free per day + earned | `rewards.js` |
| Echo Garden | Rewards → Garden | `rate × hours`, max 10 h stored | continuous | `extras.js` |
| Gift calendar | Launch popup | 50 / 80 / 2 hints / 120 / Silver / 200 / Gold | 1 per day | `extras.js` |
| Chests | Anywhere | Bronze 40–90 … Mythic 1,200–2,500 | from triggers (§5) | `rewards.js` |
| Achievements | Rewards → Achievements | 150 → 12,000 per tier + chest | 14 tracks, 4–8 tiers | `rewards.js` |

**Budget check.** The 110-level campaign pays about 63,000 coins at 3 stars. An engaged daily
player (Daily Echo, all quests, the quiz, the wheel, the calendar and two garden visits) earns
about 1,500–2,000 coins a day. That makes:

- **Commons** (150–600): bought in the first hour.
- **Rares** (400–4,100): one every day or two.
- **Epics** (2,500–9,000): one every 2–5 days.
- **Legendaries**: weeks of play each, and a milestone first.

## 3. Clover: lasting Luck (`rewards.js` `LUCK`)

**Purpose.** Reward treating echoes well, and give a free Favour that can be used in **any** level
with echoes.

| Event | Clover |
|---|---|
| An echo takes a step (`ECHO_MOVED`) | +2 |
| A coin is collected in a level | +5 |
| A level is cleared with zero echo bumps | +12 |
| An echo walks into a wall, door or block (`ECHO_BLOCKED … tries`) | −5 |
| A clover-paid Favour is used | −100 |

Clover is clamped to 0–100.

**Undo is exact.** Every command records its Clover and stats change (`tally`); undo reverses it
(`untally`), so moving and undoing cannot farm Clover.

**States.**
- **Filling**: header meter shows the bar and number.
- **Full**:
  - The meter glows and pulses, and the clover spins.
  - When the level's own Luck is not full and an echo can accept Favour, a **"Clover full! Tap for
    a free Favour"** banner pops in above the board, and the Favour button turns mint.

**Motion.**
- Each echo step floats "+2 clover" (mint) from the echo.
- Each bump floats "−5 clover" (pink) and shakes the meter.
- A clover Favour bursts petals from the Favour button.

**Rule order.** Favour spends the level's coin Luck first, and Clover only if that is not full.

## 4. Level-clear bookkeeping (`R.onClear`)

These run on every clear:
- `stats.clears++`
- `firstClears++` if it is a first clear
- if `hasEchoes && bumps === 0`: `gentle++` and +12 Clover
- the quest events in the table below

Quest events counted **at clear time** use net totals: echo steps, coins, favours, stars, perfect,
gentle, replay, clean (no hints and no undo), daily, boss. Counting at clear means undo cannot fake
them.

## 5. Chests (`rewards.js` `CHESTS`, `onClear`, `openChest`)

**Triggers.**

| Trigger | Chest |
|---|---|
| Every 3rd first clear | Bronze |
| Every 10 total stars (`starChests` counter) | Silver |
| First clear of a boss level (every 10th) | Gold, plus Silver at 3★ |
| All levels of a world cleared | Mythic |
| Every 7th consecutive Daily Echo day | Gold |
| Hard daily quests / all-quests bonus | Silver / Bronze |
| Achievement tiers | Bronze → Mythic by tier |
| Wheel | Bronze 12%, Silver 8% |
| Perfect Echo Quiz | Bronze |
| Calendar day 5 / day 7 | Silver / Gold |

**Contents.**

| Tier | Coins | Boosts | New cosmetic | Extra |
|---|---|---|---|---|
| Bronze | 40–90 | 35% chance of 1 | — | — |
| Silver | 120–260 | 1 | 25%, common/rare | — |
| Gold | 350–700 | 2 | 60%, rare/epic | 20% wheel spin |
| Mythic | 1,200–2,500 | 3 | 100%, epic | spin, 50% chance of +50 Clover |

- **Boost weights:** hints ×2 (30), +3 moves (30), lucky charm (25), skip ticket (15).
- Cosmetics only come from priced, ungated, unowned items, so **legendaries never drop**. When
  the pool is empty, the chest pays a duplicate bonus instead (300 / 900 / 3,000).

**The reveal, "glowing messiah".**

1. **Queued.** Chests earned on a clear appear in the result card ("CHEST EARNED", popping in with
   a float). After 1.9 s the reveal opens automatically. The "Open N chests" button opens it too.
2. **Descend (1.1 s).**
   - The chest falls from above the screen: `translateY(-110vh) scale(.6) rotate(-8°)`, overshoots
     12 px, then settles.
   - Behind it, god-rays (a 26 s repeating conic gradient) rotate in the tier colour.
   - A halo floats above it and a soft radial glow sits under it.
   - On landing: a thud, a vibration and a star burst in the tier colour.
3. **Idle.** The chest bobs ±12 px over 2.2 s and the halo bobs. "Tap the chest 3 times to open
   it."
4. **Charge (taps 1–2).** Each tap:
   - shakes the chest ±5°·tap and raises a tick sound's pitch;
   - sets `--charge` to 1/3, then 2/3, which grows the drop-shadow (24 px → 64 px) and brightness
     (×1.35) and makes the glow stronger;
   - updates the text: "It's waking up… tap again", then "Almost! One more tap".
5. **Burst (tap 3).**
   - Screen flash, confetti, a star burst in the tier colour, plus white sparks for Gold and
     Mythic.
   - The lid flips open (`translate(-8,-26) rotate(-28°)`), the lock fades and a light beam shoots
     up.
6. **Loot.** Cards fly in one after another, 160 ms apart, with a springy pop: coins (counting
   up), boosts, the new cosmetic (with preview, rarity glow and an **Equip** button), a spin and
   Clover.
7. **Next / Collect.** "Next chest (N)" re-stages the reveal. "Later" keeps the rest queued.

With Reduce motion on, there is no descent and a single tap opens the chest.

## 6. Reward wheel (`rewards.js` `SEGMENTS`, `spin`)

| Segment | Weight | Chance |
|---|---|---|
| 60 coins | 26 | 26% |
| 2 hints | 10 | 10% |
| 120 coins | 20 | 20% |
| Bronze chest | 12 | 12% |
| 250 coins | 12 | 12% |
| +3 moves | 10 | 10% |
| Silver chest | 8 | 8% |
| JACKPOT 2,000 | 2 | 2% |

**Spins.**
- 1 free spin per day.
- Earned spins: Daily Echo clear, all 3 quests claimed, achievement tier 2 and up, Gold chests
  (20%) and Mythic chests.
- Up to 5 can be banked.

**Pity.** After 4 spins with no chest or jackpot, the next spin only rolls chest or jackpot
(Bronze 60, Silver 35, Jackpot 5). Progress shows as "Lucky streak n/4".

**Motion.**
- The result is chosen first, then the wheel animates to it.
- Target rotation = `current + 5·360 + ((−idx·45 − current) mod 360) + jitter(±13.5°)`.
- Easing is `1−(1−t)^4` over 4.6 s.
- Each time a segment boundary passes the pointer, it plays a tick (pitch cycles) and the pointer
  flaps (−18° → 0 over 120 ms).
- On stop, the winning segment flashes.
- The jackpot adds thunder, a flash, 60 confetti and star bursts.
- A chest result offers "Open it now", which starts the reveal.

## 7. Daily quests (`rewards.js` `QUESTS`)

- **Selection.** One quest per band (easy, medium, hard) per UTC day, chosen by
  `FNV(day + ':' + band) mod poolSize`, so everyone gets the same three.
- **Pools.**
  - Easy: clear 2, earn 4★, 20 echo steps, 3 coins, spin once.
  - Medium: par clear, gentle clear, Daily Echo, 2 replays, clean clear.
  - Hard: 12★, 2 par clears, boss, 100 steps, Favour twice, 3 gentle clears.
- **Claiming** is manual (a gold "Claim" button). Claiming all three gives +1 spin and a Bronze
  chest.
- The level result names any quest completed by that clear.

## 8. Achievements (`rewards.js` `ACH`)

There are 14 permanent tracks, each with 4–8 tiers:
stars, perfect, gentle, echo steps, collection, per-slot ownership ×4, chests opened, spins, daily
streak, worlds and coins earned.

Tier *k* pays:
- coins: `[150, 300, 600, 1200, 2500, 5000, 8000, 12000][k]`
- a chest: `[Bronze, Silver, Silver, Gold, Gold, Mythic, Mythic, Mythic][k]`
- +1 spin from tier 2 on.

Claimed tiers also count toward the `achievements` legendary gate (Cosmic Eye).

## 9. Echo Quiz (`extras.js`)

A daily mini-game that teaches the core rule.

**Generating a question** (question *k* of day *d*, seeded by FNV(`d:quiz:k:attempt`)):
1. Build a walled room: 6×5 up to 8×6, with 0–5 inner walls.
2. Place the player, one echo (Trace, or Flicker on questions 3 and 5) and an exit.
3. Make random moves through the **real engine**, keeping only accepted, non-winning ones, until
   there are 4 / 8 / 6 / 12 / 10 moves.
4. The answer is the echo's final tile. Questions where it never moved are rejected.
5. Distractors are the classic misreadings:
   - the echo copies every move;
   - it copies the last move of each group;
   - it never moves;
   - plus the tiles next to the answer.
6. Four distinct options are shuffled and labelled A–D.

**Answering.**
1. The moves strip shows the groups separated.
2. After an answer, each group's first move lights up gold, and a ghost ring replays the echo's
   path one step every 320 ms with ticks.
3. The result explains: "Echo only copied the first move of each group: → ↑".
4. Pay is 20/30/45/60/80. 5/5 adds +100 and a Bronze chest.

Tests check every generated answer against the engine for 150 questions.

## 10. Echo Garden (`extras.js`)

Everything you own lives in the garden and earns coins while you are away.

`rate/h = 4 + Σ owned items (common 0.5, rare 1, epic 2.5, legendary 12) × (1.5 for characters)`

- Storage caps at **10 hours**, so it pays to check in twice a day. Collecting resets the timer.
- **Why this protects legendary value:** a legendary character earns 18 coins an hour, forever, on
  top of its aura. It pays back its price over many months of play, so it rewards long-term
  players without short-circuiting the economy.
- **Scene:** up to 10 owned characters (legendary first) wander a night meadow in a 7 s loop.
  Coins bob on the grass in proportion to the stored amount. Collect flies them to the coin pill.

## 11. Gift calendar (`extras.js`)

- **Cycle:** a 7-day gift cycle: 50, 80, 2 hints, 120, Silver chest, 200, Gold chest.
- **When it appears:** on launch, on the first visit each UTC day (after the first-run help).
- **No reset:** missing days never resets progress, and the cycle repeats after day 7.
- **Display:**
  - The next gift glows and floats; claimed days are dimmed with a ✓.
  - Chest gifts go straight into the reveal.

## 12. Locked content: always say why and how

| Locked thing | What the player sees |
|---|---|
| Level | Map node shows a lock. Tap: "Clear level N to unlock this one". The info panel says "Clear level N (or skip it with a Skip ticket) to unlock this level." |
| Legendary item | Card shows "Step 1: Earn 120 stars", a progress bar and "6 / 120 · Step 2: 50,000 coins". The Locked button repeats both steps with your current number. |
| Milestone item | Card tag "REWARD: CLEAR EVERY LEVEL IN WORLD 6". Tapping Locked explains it is a free reward. |
| Too expensive | "N more coins needed" above the disabled price. |
| Daily Echo | "Clear level 1 to unlock", or "Done for today. Back tomorrow!" |
| Wheel | Lock icon on the hub, "Next free spin in 5h 12m", and a list of how to earn spins. |
| Quests / Quiz | Progress bars, then "New quests/puzzles in Xh Ym". |
| Favour | "Favour needs 100 Luck. Collect coins in this level, or fill your Clover (n/100)…" |
| Undiscovered echo | "Reach level N to meet this one." |

## 13. Try-on: in-level previews that sell (`main.js` `TRY`)

**Trigger.**
- Not on tutorial levels, levels below 5, or the Daily Echo.
- A gap counter must reach 3 level starts. After that, each start has a 45% chance.
- So there is about one try-on every 4–5 levels.

**Pick.**
1. Choose a slot: orb, trail ×2, portal, or character if the level has echoes.
2. Pick an unowned, priced, non-milestone item with weight `rarity (common 3, rare 4, epic 3,
   legendary 0.5) × 1.7` if its price is at most `coins·1.3 + 300`.
3. So items within reach are favoured, and legendaries are rare (≈ 5% of try-ons).

**States.**
1. **Active (8 moves).**
   - The board renders the item instead of your own, and a legendary also switches on its aura.
   - The coach announces it.
   - A chip under the board shows "✦ TRY-ON · n moves left", the rarity and an **inline Buy**.
2. **Ended.**
   - Your own cosmetics return.
   - The chip turns into "TRY-ON OVER · LIKED IT?" with the price struck through and the **15%
     try-on discount**, valid until you leave the level, plus "N more coins" when you are short.
   - Legendary items show their milestone and full price instead. They are never discounted.
3. **Dismissed / bought.** Buying equips the item instantly, with confetti.

## 14. Animated trails and cosmetics catalogue

**Hand-made sets** are class-based, plus legendaries with auras.

**Generated sets** (`cosmetics.js`):
- Generation: 30 named palettes × visual styles, seeded-shuffled. Each item draws from
  `--c1/--c2/--c3`.
- Generated counts:
  - 40 orbs: gem, glass, split, dotted, banded, pulse, swirl, ringed.
  - 40 static trails: 12 shapes.
  - 40 portals: 7 styles.
  - 16 **animated trails** (`ta-*`):
    - spinning stars, ripples, heartbeat, twinkle (rare);
    - orbit, helix, prism, wisp (epic).
    - They keep moving on the board, and every step draws a glowing **ribbon** from the previous
      tile with sparkles (`Amb.ribbon`).
- Totals: 55+ orbs, 70 trails, 53 portals and 68 characters.
- Static and animated trails are separate batches with their own seeds, so adding items never
  reshuffles existing ids.

## 15. Demo clips for new mechanics (`demos.js`)

The first level that introduces a mechanic (Echo 2, plates 3, crates 4, coins and Favour 5,
Keeper 6, Mason 7, Blocker 8, Flicker hop 9, powered portal 17) plays a looping clip on its intro
card and in the Plan sheet.

**What the clip shows.**
- A tiny board driven by the **real engine** with a scripted move list.
- A key-press bubble, the echo's tape (slot 1 in gold, pulsing when the echo acts) and captions
  timed to steps.

**Pacing.**
- 900 ms per move, 1.2 s for Favour and hop.
- After the last move it holds 1.7 s, then loops.

**Verification.** A test replays every clip and checks the promised outcome: win, echo position,
favoured, helper and door, blocks built, corruption, hop.

## 16. Levels 61–110 (`tools/generate-levels.js`)

Five new worlds:
- Echo Chamber (twin echoes, escape together)
- Heavy Rhythm (crate + Trace, two doors in series)
- Quicksilver (hops into sealed rooms, Favour, move limits)
- Workshop (Mason + Keeper)
- Storm Front (Blocker interference)

**How a level is made.**
1. A per-world recipe builds random rooms: dividers with doors, a plate on the near side, echoes,
   crates and scattered walls.
2. Each candidate must:
   - be solved by the BFS solver;
   - pass the **needs ablation** for every taught element (freeze the echo, strip crates, disable
     hop, strip coins: each must make the level unsolvable);
   - for the Blocker, be measurably harder than without it.
3. From the pool, 10 levels per world are picked across the difficulty range (par, then explored
   states), hardest last as the boss.
4. Intro and plan text is written from the map and the optimal solution, e.g. "Trace gets → → ↓ as
   the first moves of its groups".

All levels carry their proven optimal `solution`, and `tools/test.js` replays every one.
