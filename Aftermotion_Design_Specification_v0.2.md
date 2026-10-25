# AFTERMOTION — Design Specification v0.2

### Redesign for fun, scale and replay · 1000-level plan · generative content pipeline

Status: proposal. Supersedes the progression, echo roster, economy and content sections of v0.1. The time model, deterministic resolution order, batch rule and fairness constraints of v0.1 still apply unless this document changes them.

---

## 0. What changes from v0.1, and why

| v0.1 | v0.2 | Why |
|---|---|---|
| Echoes are hand-designed archetypes (Trace, Flicker, …). | Echoes are **compositions** of four parts: *Selector × Transform × Verb × Cadence*. Named echoes are presets of those parts. | One small rules engine produces dozens of distinct echoes. New content costs data, not code. |
| Favour/Luck is a core campaign system. | Campaign uses deterministic **Surge charges** granted by the level. Luck exists only in the endless Rift mode. | Luck-driven favour added randomness without adding thought. Mandatory solutions must stay deterministic. |
| ~10 handcrafted levels. | **1000 levels**: 20 worlds × 50. About 120 handcrafted (teaching and bosses), 880 generated offline, solver-verified and curated. | Handcrafting 1000 levels is not feasible. Generation is only safe because the rules are deterministic and solvable by search. |
| One fixed layout per level. | Every level is a **recipe** plus a canonical seed. Replays serve **variants** with the same mechanics and difficulty band but a different layout. | Replay stays fresh, and nobody can memorise a solution to farm it. |
| Rewards unspecified. | Coins, Shards and Stars, with **decaying, capped, regenerating** replay rewards. Echo unlocks gate worlds, and first clears alone always cover the cost. | Lets you grind optionally, never forces it, and builds a daily return habit. |
| Difficulty is the designer's guess. | Difficulty is **measured** from the solver (§7) and **calibrated** from player data (§8.4). | Needed to order 1000 levels and to keep variants equally hard. |

Design stance: early levels are gentle and teach one thing at a time. Legibility support (pips, arrows, Oracle) stays in the game, but later levels deliberately pile up interacting systems. Late-game difficulty is intended.

---

## 1. Pillars and loops

### 1.1 Pillars
1. **One clever rule, many consequences.** Your moves are a program that each echo compiles differently.
2. **Deterministic puzzles, provably fair.** Every level ships with a machine-checked solution. Randomness only picks *which* puzzle you get, never what happens inside it.
3. **Always something new within 10 minutes.** A new echo, tile, enemy or mutator appears at a steady rhythm (§6.3).
4. **Mastery is visible.** Par, stars, crowns and leaderboards turn "solved" into "solved well".
5. **Fair grind.** Grinding is optional and rate-limited. It speeds you up but never gates you.

### 1.2 Loops
| Loop | Length | Player does | Gets |
|---|---|---|---|
| Core | 30 s – 8 min | Solve a level | Coins, stars, unlock progress |
| Mastery | Minutes | Replay a variant for ★3 or a crown | Star-delta coins, Shards |
| Meta | Days | Unlock and upgrade echoes, open worlds | New verbs, which mean new puzzles |
| Daily | 5–15 min/day | Daily Echo, Weekly Gauntlet, rested replay bonus | Streak multiplier, Shards, cosmetics |
| Endless | Unbounded | Rift runs with your own echo loadout | Coins (daily-capped), rank, cosmetics |

---

## 2. Core rules (kept and extended)

### 2.1 Kept from v0.1
- Grid, four directions, turn-based. One accepted player move is one simulation tick. All timers count ticks.
- Invalid player moves are not recorded and do not advance any echo.
- Each echo keeps its **own** batch buffer and counter. A blocked echo action still consumes the batch.
- The batch size is sampled when a batch starts.
- The deterministic resolution order (v0.1 §14), extended in §2.4.

### 2.2 New: the echo composition model
An echo is a 4-tuple **E = ⟨Selector, Transform, Verb, B⟩** plus optional perks.

**Selector**: which direction(s) of the completed batch `b[0..B-1]` the echo takes.

| Id | Rule | Output |
|---|---|---|
| `HEAD` | `b[0]` | 1 dir |
| `TAIL` | `b[B-1]` | 1 dir |
| `MAJORITY` | Most frequent direction. Ties go to the earliest occurrence. | 1 dir |
| `ODD` | The direction that occurs exactly once. If several do, the earliest. If none, `IDLE`. | 1 dir or idle |
| `PENDULUM` | `HEAD` on odd batches, `TAIL` on even batches. | 1 dir |
| `SUM` | Vector sum Σb. The echo moves \|dx\| steps on x, then \|dy\| steps on y, and stops at the first obstacle. | Multi-step |
| `MIRROR_OF(e)` | The direction echo `e` **executed** this tick (only if it moved). | 1 dir or idle |

**Transform**: how the selected direction is reinterpreted.

| Id | UP→ | RIGHT→ | DOWN→ | LEFT→ |
|---|---|---|---|---|
| `ID` | UP | RIGHT | DOWN | LEFT |
| `MIRROR_X` | UP | LEFT | DOWN | RIGHT |
| `MIRROR_Y` | DOWN | RIGHT | UP | LEFT |
| `INVERT` | DOWN | LEFT | UP | RIGHT |
| `ROT_CW` | RIGHT | DOWN | LEFT | UP |
| `ROT_CCW` | LEFT | UP | RIGHT | DOWN |

Transforms are elements of the dihedral group D4. Rotor tiles (§4) compose a transform onto an echo at runtime: `T_new = R ∘ T_old`.

**Verb**: what the echo does with the final direction `d`.

| Id | Effect | Fails when |
|---|---|---|
| `WALK` | Move one tile. | Target is not passable for an echo. |
| `PUSH` | Walk. If the target holds a push block, push it (atomic, like the player). | Block cannot move. |
| `BUILD` | Place a temporary block on the adjacent tile in direction `d` (TTL, charges). | Illegal placement (v0.1 §7.2). No charge is spent. |
| `BREAK` | Destroy a cracked wall or corruption block at the adjacent tile in direction `d`. Otherwise walk. | Nothing breakable and move blocked. |
| `SWAP` | Swap positions with the player if the player is within Manhattan range `r`. Otherwise walk. | Swap tile illegal for either actor. |
| `SEND` | Spawn a helper that seeks the nearest valid target in direction `d`'s half-plane. | No target. No charge is spent. |
| `PHASE_WALK` | Walk, ignoring echo-phase walls. | Normal wall or block. |
| `STAMP` | Activate the toggle or rotor at the adjacent tile without moving. | Nothing to stamp. |

**Cadence B**: 1–6. Upgrades follow v0.1 §15: `B = max(Bmin, B0 − r·U)`.

> The composition model is the main reason the game can scale. 7 selectors × 6 transforms × 8 verbs × 6 cadences gives about 2000 combinations. We ship about 18 named presets, but generated levels and the Rift can use any *legal* combination with an auto-generated name such as "Inverted Tail-Mule (B3)".

### 2.3 Surge (replaces campaign Favour)
- A level recipe may grant 0–2 **Surge charges**. Pressing Surge sets every echo's next batch size to `max(1, B − 2)` for 2 batches. After that, the echoes take a +1 batch-size penalty for 1 batch (v0.1 cooldown option A).
- Surge is deterministic and part of the puzzle, and the solver counts it as an action.
- Luck and Favour remain only in Rift mode (§10.3), where randomness is the point.

### 2.4 Resolution order (extends v0.1 §14)
1. Validate player input. 2. Player movement and push. 3. Tile on-enter effects for the player (ice slide, conveyor, teleporter, collapse mark). 4. Echo batch accumulation. Due echoes act in **stable id order**, with `MIRROR_OF` echoes resolving after their source. 5. Tile on-enter effects for echoes. 6. Helpers. 7. Hostile movement (Pursuer, Mimic). 8. Plates, doors and toggles recomputed. 9. Cycling tiles advance (spikes and timed doors use `tick mod period`). 10. Hostile telegraph resolution. 11. Temporary object expiry (never embeds an actor). 12. Surge timers. 13. Capture, fall and loss checks, then win check.

---

## 3. Echo roster

Every echo has a role, a weakness and a three-tier upgrade path. **Tier I** is the unlock. **Tier II** costs Shards and gives a perk. **Tier III** costs Shards and gives a signature perk. Upgrades never break a canonical level, because canonical solutions are verified with Tier I stats (§9.3).

| # | Echo | Preset ⟨Sel, Tf, Verb, B⟩ | Unlock (world / coins) | Role | Weakness | Tier II | Tier III |
|---|---|---|---|---|---|---|---|
| 1 | **Trace** | HEAD, ID, WALK, 4 | W1 / free | Baseline follower | Slow | B=3 | Ignores one blocked batch per level (skips instead of stalling) |
| 2 | **Mule** | HEAD, ID, PUSH, 4 | W2 / 1,280 | Moves blocks by echo | Can trap itself behind blocks | Pushes 2-block chains | Can pull once per level |
| 3 | **Looking-Glass** | HEAD, MIRROR_X, WALK, 4 | W3 / 1,440 | Opposite horizontal routes | Confusing | B=3 | Mirror axis toggles with a key |
| 4 | **Lag** | TAIL, ID, WALK, 3 | W4 / 1,590 | Rewards how a batch *ends* | Head-planning habits break | B=2 | Selector switchable HEAD/TAIL once per level |
| 5 | **Flicker** | HEAD, ID, WALK, 2 | W5 / 1,740 | Fast, short windows | Overshoots | Hop (range 3, 1 charge) | Hop range 4 + 2 charges |
| 6 | **Mason** | HEAD, ID, BUILD, 4 | W6 / 1,890 | Bridges over pits, barricades, plate weights | Charges, TTL | +1 charge | Blocks last 2× longer |
| 7 | **Keeper** | HEAD, ID, SEND, 3 | W7 / 2,050 | Helper holds plates and carries keys | Arrival window | Helper range +3 | Two helpers at once |
| 8 | **Sapper** | HEAD, ID, BREAK, 4 | W8 / 2,200 | Opens cracked walls, clears corruption | Destruction is permanent | B=3 | Breaks 2 tiles in a line |
| 9 | **Contrarian** | HEAD, INVERT, WALK, 3 | W9 / 2,350 | Moves away from you | Fights you near walls | Ice-immune | Invert toggles on stamp |
| 10 | **Consensus** | MAJORITY, ID, WALK, 5 | W10 / 2,500 | Ignores noise; only "votes" count | Very slow | B=4 | Tie-break chooses TAIL |
| 11 | **Phantom** | HEAD, ID, PHASE_WALK, 4 | W11 / 2,660 | Passes echo-phase walls | Cannot press player-only plates | B=3 | Passes one door per level |
| 12 | **Swapper** | TAIL, ID, SWAP(r=4), 5 | W12 / 2,810 | Teleports the player | Swap can strand you | r=6 | Swap optional (skip if it would cause a loss) |
| 13 | **Rotor** | HEAD, ROT_CW, WALK, 3 | W14 / 3,110 | Turns your rows into columns | Hard to path | Direction toggle CW/CCW | Stamps rotors it passes |
| 14 | **Pendulum** | PENDULUM, ID, WALK, 3 | W15 / 3,270 | Alternating rhythm | Phase errors | B=2 | Phase reset tile immunity |
| 15 | **Weaver** | SUM, ID, WALK, 4 | W16 / 3,420 | Multi-tile dashes | Cancelling inputs make it idle | Dash stops *before* hazards | Leaves a 1-tick temporary trail |
| 16 | **Shadow** | MIRROR_OF(nearest), ID, WALK, 1 | W18 / 3,730 | Copies another echo's executed moves | Useless alone | Chooses source | Copies the source's verb too |
| 17 | **Oracle** | Utility lens, not on the board | Shop after W5 / 1,500 | Preview depth 1 (all directions) | No hint about *which* move | Depth 2 | Shows batch heads two batches ahead |
| 18 | **Gambit** | Rift-only utility | Shop after W10 / 2,000 | Luck events in the Rift | None in campaign | Luck +25% | One free reroll per Rift room |

**Loadout slots** (bonus echoes you bring into a level): 0 in W1–5, 1 from W6, 2 from W12, 3 in the Rift. Canonical levels are always solvable **without** a bonus echo. A bonus echo can open a shorter route, which is how you earn a **crown** (beating the canonical par, §9.2).

---

## 4. World objects

Introduced gradually: about one new object per world, plus mutators.

| Object | Rule | Introduced |
|---|---|---|
| Wall, floor, exit | v0.1 | W1 |
| Pressure plate / door | v0.1 (occupancy-safe doors) | W1 |
| Coin, gem | Coin: soft currency in the level. Gem: 1 Shard, first collection only. | W1 / W3 |
| Push block | v0.1 | W2 |
| Pit | Impassable. A push block or temp block pushed or built into it fills it, and it becomes floor. A Mason block over a pit is a bridge until its TTL ends. | W2 |
| One-way tile | Enter only along its arrow. | W3 |
| Toggle plate | Flips the linked door on each entry edge. | W4 |
| Timed plate | Holds the door open for `D` ticks after release (refresh policy). | W5 |
| Cracked wall | A wall that `BREAK` removes. | W8 |
| Ice | An actor entering slides until stopped (affects echoes too). | W9 |
| Conveyor | At end of tick, moves the occupant one tile along its arrow if legal. | W10 |
| Phase wall (echo / player) | Passable only for one actor class. | W11 |
| Teleporter pair | Entering moves the actor to the twin if it is free. Otherwise the move is blocked. | W12 |
| Key / lock | Player or helper carries a key. A lock opens permanently. | W7 |
| Rotor tile | An echo entering it composes `ROT_CW` onto its transform. | W14 |
| Silence tile | An echo entering it has its batch buffer cleared (counter = 0). | W15 |
| Cadence tile | An echo entering it gets B ±1 (bounded 1..6) until it stands on another cadence tile. | W15 |
| Collapse tile | Becomes a pit after an actor leaves it. | W19 |
| Spikes (cyclic) | Lethal when `(tick + phase) mod period < onTicks`. | W19 |

### 4.1 Hostiles
| Hostile | FSM | Introduced |
|---|---|---|
| **Blocker** | IDLE → TELEGRAPH(2) → PLACE corruption(TTL 6) → RECOVER(3). Uses v0.1 §9.2 scoring. | W8 |
| **Pursuer** | Moves one step toward the player every `k` ticks by BFS, with fixed (UP, RIGHT, DOWN, LEFT) tie-break. Capture means loss. Blocked by blocks; can be lured onto ice and pits. | W13 |
| **Saboteur** | Telegraphs, then toggles a plate/door or deletes a temp block within range. | W15 |
| **Mimic** | A *hostile echo*: ⟨TAIL, INVERT, WALK, 3⟩. Touching the player means loss. Your moves program it, so you must steer it into pits. | W17 |
| **Eraser** | Moves along a fixed patrol loop. Any echo it touches loses its batch buffer, and helpers expire. | W19 |

### 4.2 Mutators (level-wide modifiers, used from W11 on)
`Tight` (move limit = par + 10%) · `NoUndo` · `Dark` (only tiles within radius 3 of an actor are visible) · `Echo-Solid` (echoes block each other and the player) · `Drift` (one conveyor row reverses every 10 ticks) · `Mirror World` (the player's own input is transformed by MIRROR_X) · `Silent Start` (echoes start with pre-filled counters, a phase offset).

---

## 5. World plan: 1000 levels

### 5.1 Structure
20 worlds × 50 levels. Each world introduces one **headline** (echo, enemy or major object), one or two minor objects, and from W11 one or more mutators.

| World | Levels | Name | Headline | Minor | Avg D | Max D |
|---|---|---|---|---|---|---|
| 1 | 1–50 | First Light | Trace, batch rule | Plate, door, coin | 9 | 26 |
| 2 | 51–100 | Weight | Mule, push blocks | Pit | 13 | 30 |
| 3 | 101–150 | Looking-Glass | Mirror echo | One-way, gem | 17 | 34 |
| 4 | 151–200 | Afterimage | Lag (TAIL) | Toggle plate | 22 | 39 |
| 5 | 201–250 | Quickstep | Flicker + Hop | Timed plate, Surge | 26 | 43 |
| 6 | 251–300 | Masonry | Mason | Pit bridges, loadout slot 1 | 30 | 47 |
| 7 | 301–350 | Helping Hands | Keeper | Key / lock | 34 | 51 |
| 8 | 351–400 | Interference | Blocker, Sapper | Cracked wall | 38 | 55 |
| 9 | 401–450 | Contrary | Contrarian | Ice | 42 | 60 |
| 10 | 451–500 | Consensus | Consensus | Conveyor | 46 | 64 |
| 11 | 501–550 | Phase | Phantom | Phase walls, mutators begin | 50 | 68 |
| 12 | 551–600 | Exchange | Swapper | Teleporters, slot 2 | 54 | 72 |
| 13 | 601–650 | Pursuit | Pursuer | Hop upgrades matter | 58 | 76 |
| 14 | 651–700 | Rotation | Rotor | Rotor tiles | 62 | 81 |
| 15 | 701–750 | Silence | Pendulum, Saboteur | Silence + cadence tiles | 66 | 85 |
| 16 | 751–800 | Vector | Weaver | SUM interactions with ice | 70 | 89 |
| 17 | 801–850 | Mimicry | Mimic | `Mirror World` mutator | 74 | 93 |
| 18 | 851–900 | Shadow | Shadow chains | Echo-Solid | 78 | 97 |
| 19 | 901–950 | Fracture | Eraser | Collapse, spikes | 82 | 100 |
| 20 | 951–1000 | Aftermotion | Everything | Generated combinations of composed echoes | 86 | 100 |

### 5.2 The 50-level world template
| Slot | Levels | Purpose | Source | Rule set |
|---|---|---|---|---|
| Teach | 1–3 | New headline alone, tiny board, cannot fail badly | Handcrafted | Headline only |
| Show | 4–5 | Headline plus one known object | Handcrafted | +1 old |
| Practice | 6–15 | Headline + 1–2 old objects | Generated | ≤3 mechanics |
| Combine | 16–30 | Headline + earlier echoes | Generated | ≤4 mechanics |
| Twist | 31–40 | Minor object introduced, plus a mutator (W11+) | Generated (31–32 handcrafted teach) | ≤5 |
| Mastery | 41–48 | High D, multi-room | Generated, hand-curated | ≤6 |
| Gauntlet | 49 | 3 rooms chained; state carries over | Generated + curated | All world |
| Boss | 50 | Multi-phase set piece; layout changes between phases | Handcrafted | All world |

Handcrafted per world: L1–5, L31–32 and L50, which is 8 × 20 = **160 levels**. Generated: **840**. Every 5th level is a **breather** (D −6). Every 10th has a guaranteed gem.

### 5.3 Difficulty curve
For level `n` with world `w = ⌈n/50⌉` and index `i = ((n−1) mod 50) + 1`:

```
base(w)   = 4 + 4.2·(w − 1)
D(n)      = clamp(1, 100, base(w) + 14·(i/50)^1.3
                         − 6·[i mod 5 = 0 and i < 49]      # breather
                         + 8·[i = 50])                      # boss
Teach(i ≤ 3): D(n) = max(3, 0.45·base(w) + i)              # new mechanic resets complexity
```
This gives a sawtooth: each world starts easier than the previous world ended (a new verb is hard enough on its own), then climbs past it.

### 5.4 Pacing targets (median player)
| Worlds | Time per level | Cumulative play |
|---|---|---|
| 1–2 | 30–90 s | ~2 h |
| 3–6 | 1–3 min | ~10 h |
| 7–12 | 2–5 min | ~30 h |
| 13–20 | 4–12 min | 80–120 h |

---

## 6. Level identity, recipes and variants

### 6.1 A level is a recipe, not a map
```json
{
  "id": 437,
  "world": 9, "slot": "Combine",
  "mode": "together",
  "size": [11, 9],
  "echoes": [{"preset": "contrarian", "required": true}, {"preset": "trace"}],
  "mechanics": ["ice", "plate_door", "push_block"],
  "hostiles": [],
  "mutators": [],
  "surge": 0,
  "targetD": 46.8, "tolerance": 4,
  "canonicalSeed": "0x9e3779b97f4a7c15",
  "canonical": { "map": "…RLE…", "par": 23, "D": 47.3, "solution": "…" },
  "variants": [ { "seed": "…", "map": "…", "par": 22, "D": 45.9 }, "… 11 more" ]
}
```
- The **canonical** layout is what leaderboards, guides and the first attempt use.
- **Variants** share `mode, echoes, mechanics, hostiles, mutators, surge`. They differ in layout and phase, and their measured `D` stays within `targetD ± tolerance`.

### 6.2 Which version a replay gets
```
version(levelId, player, k):            # k = number of completed plays of this level by this player
    if k == 0: return canonical
    pool = level.variants                # 12 shipped, solver-verified
    j = (hash(player.salt, levelId) + k − 1) mod (|pool| · 8 · P)
    v = pool[j mod |pool|]
    v = applySymmetry(v, (j div |pool|) mod 8)          # D4 board symmetry, conjugated into echo transforms
    v = applyPhaseOffset(v, (j div (8·|pool|)) mod P)   # pre-filled batch counters
    if v.phaseOffset ≠ 0 and not v.verifiedPhase: v = verifyOrSkip(v)
    return v
```
**Symmetry conjugation.** Rotating or reflecting the board by `g ∈ D4` must also map every echo transform `T → g ∘ T ∘ g⁻¹`, and arrow tiles likewise. With that, solvability and par are preserved exactly, so no re-solve is needed. Phase offsets change timing, so they must be re-verified. The on-device worker solves them within a budget and skips any that time out.

With 12 variants × 8 symmetries × P=4 phases, each level has **384 distinct versions**, and every one is guaranteed solvable with the same mechanics.

### 6.3 Novelty rhythm (keeps players hooked)
At least one of these must happen every 5 levels: a new object or echo, a new combination never seen before, a mutator, a breather with a gem, or a Gauntlet/Boss. The level-ordering tool (§9.4) enforces this when it arranges generated levels.

---

## 7. Measured difficulty

### 7.1 Solver features
Computed by the solver on each candidate level:

| Feature | Definition | Why it matters |
|---|---|---|
| `L*` | Length of the shortest solution | Effort |
| `S` | log₁₀ of states expanded by BFS/IDA* to the first solution | Search depth that humans also face |
| `K` | Count of *pivotal events* on the optimal path (plate change, echo verb success, block in pit, teleport, enemy placement) | Interacting mechanics |
| `H` | Planning horizon: max over pivotal events of (tick of event − tick of the earliest move that is *forced* for it). Measured by mutating each move and checking whether the event still happens. | The "think ahead" that batches create |
| `T` | Trap rate: fraction of states on the optimal path where the greedy move (shortest path to the exit for the player) leads to a stuck state | Ways to go wrong |
| `X` | Dead-end density: stuck states / reachable states (sampled, capped) | Ambiguity cost |
| `N` | Number of distinct solution classes (cluster all solutions ≤ `L*+4` by pivotal-event sequence) | Fewer means a more demanding "aha" |
| `M` | Number of distinct mechanics actually used on the optimal path | Breadth |

### 7.2 Score
```
D_raw = 1.0·z(L*) + 2.0·S + 1.5·K + 2.5·H/10 + 3.0·T + 1.5·X − 1.0·log₂(N) + 0.8·M
D     = 100 · σ((D_raw − μ) / s)        # σ = logistic; μ, s fit so that the shipped set spans 1–100
```
The weights are initial guesses. They are re-fit after launch by regressing per-level **solve rate**, **median time** and **undo count** on the features (ridge regression), retrained each content update.

### 7.3 Mechanic necessity (teaching integrity)
A level claims mechanic set `M`. For each `m ∈ M`, build an ablated level where `m` is neutralised: echo frozen, blocks immovable, ice treated as floor, plate permanently on, and so on. Re-solve it.
- If the ablated level is **still solvable within `L*+2`**, then `m` is decorative. **Reject** the level, or demote `m` from the recipe.
- This guarantees every listed mechanic actually matters to the solution.

### 7.4 Triviality filters
Reject a candidate when any of these holds:
- `L* < 6`, outside Teach slots.
- `T = 0` and `N > 20` (too loose).
- The player's own shortest walk to the exit (ignoring echoes) is already a solution.
- An echo's batch heads on the optimal path are unconstrained, meaning any input reaches the goal.

---

## 8. Generation pipeline (offline, deterministic, regenerative)

### 8.1 Overview
```
recipe ─► layout grammar ─► motif stamping ─► actor placement ─► SOLVE ─► necessity ─► metrics
           ▲                                                       │ fail/off-target
           └────────────── simulated-annealing mutation ◄──────────┘
accepted ─► variant search (same recipe, ±tolerance) ─► pack ─► curation queue ─► ship
```
Everything runs on a seeded PCG32 RNG, so `(recipe, seed)` always regenerates the same level. Content is *regenerative*: a broken or disliked level is replaced by re-running its recipe with the next seed, with no designer time required.

### 8.2 Layout grammar
1. Partition the `w×h` board into 1–4 **rooms** (BSP split with a minimum room size of 3×3).
2. Connect rooms with corridors along a spanning tree, plus 0–2 extra loops (loops add route choice and therefore `N`).
3. Scatter interior walls by cellular automaton (2 iterations, B5/S4 rule), keeping connectivity.
4. Place start and exit at near-maximum BFS distance, and in different rooms when there are 2 or more rooms.

### 8.3 Motif library
A **motif** is a small pattern with sockets that *forces* a mechanic. Motifs are what turn a random maze into a puzzle.

| Motif | Shape | Forces |
|---|---|---|
| `GATE` | Door on the only cut-edge between start and exit regions. Plate inside a pocket reachable only by an echo (phase wall, one-way, or a gap the player can't take). | Using an echo as a mechanism |
| `CADENCE_LOCK` | Timed plate whose window `D` is shorter than the echo's arrival interval unless batches are planned | Batch-head planning |
| `PIT_RUN` | Row of pits between player and exit, with blocks off-axis | Push order |
| `ESCORT` | Required echo spawns in a corridor whose turns require specific batch heads | Together-mode steering |
| `LURE` | Pursuer/Mimic path passes a pit or ice lane | Baiting hostiles |
| `RELAY` | Two echoes with different cadences must hit two plates simultaneously | Multi-echo sync |
| `SWITCHBACK` | One-way loop that resets an echo's position relative to the player | Phase management |
| `KEY_FERRY` | Lock behind a door, key in an echo-only area, helper carries it | Keeper routing |

```
placeMotifs(layout, mechanics, rng):
    for m in shuffle(mechanics, rng):
        candidates = [s for s in sockets(layout) if fits(MOTIF[m], s)]
        if not candidates: return FAIL
        stamp(layout, MOTIF[m], pickWeighted(candidates, score=onCriticalPath(s), rng))
    return OK
```

### 8.4 Main generator
```
generate(recipe, seed):
    rng = PCG32(seed); best = None
    for attempt in 1..40:
        L = layoutGrammar(recipe.size, rng)
        if placeMotifs(L, recipe.mechanics, rng) == FAIL: continue
        placeActors(L, recipe.echoes, recipe.hostiles, rng)
        r = solve(L, cap = CAP[recipe.world])
        if r.result != WIN: continue
        if not necessity(L, recipe.mechanics, r.Lstar): continue
        if trivial(L, r): continue
        d = difficulty(L, r)
        L, d = anneal(L, d, recipe.targetD, rng, steps = 300)
        if |d − recipe.targetD| ≤ recipe.tolerance: return (L, d, r)
        best = closer(best, (L, d, r), recipe.targetD)
    return best  # flagged for curation if off-target

anneal(L, d, target, rng, steps):
    temp = 1.0
    for t in 1..steps:
        L2 = mutate(L, rng)       # toggle a non-critical wall | move an object ±1 | shift an echo start
                                  # | change a phase offset | swap two motif sockets
        r2 = solve(L2); if r2.result != WIN or not necessity(L2): continue
        d2 = difficulty(L2, r2)
        Δ = |d2 − target| − |d − target|
        if Δ < 0 or rng.next() < exp(−Δ / temp): L, d = L2, d2
        temp *= 0.985
    return L, d
```

### 8.5 Solver at scale
- **State hash**: 64-bit Zobrist over (player, echo positions, counters, buffers, transforms, block set, door/toggle states, helpers, hostiles, `tick mod lcm(periods)`, Surge). This replaces the prototype's JSON signatures.
- **Search**: BFS up to 2×10⁵ states. Beyond that, **IDA\*** with the admissible heuristic
  `h = max(dist_player→exit, max over required echoes e of dist_e→exit · Bmin_e)`,
  because each echo step needs at least `Bmin` player moves.
- **Symmetry and dominance pruning**: if a state differs from a visited state only in batch-buffer entries the selector can never read (for example, non-head entries of a HEAD echo whose batch is already started), it is the same state. Canonicalise those entries before hashing. This cuts states by roughly 3–20× for HEAD echoes.
- **Budget**: offline, 10 s per candidate on one core. On device, a Web Worker with 200 ms for stuck checks and 1.5 s for variant phase verification.
- **Stuck detection in game** (already prototyped): the same search runs after every move. "Unknown" never triggers a warning.

### 8.6 Variant search
```
makeVariants(recipe, canonical, count = 12):
    out = []; seed = canonical.seed
    while |out| < count:
        seed = splitmix64(seed)
        (L, d, r) = generate(recipe with targetD = canonical.D, tolerance = 4, seed)
        if L and |r.Lstar − canonical.Lstar| ≤ 0.15·canonical.Lstar
             and similarity(L, canonical) < 0.6        # Jaccard over wall + object tiles, after symmetry
             and all(similarity(L, v) < 0.6 for v in out):
            out.append(L)
    return out
```

### 8.7 Curation and ordering
1. A human reviews 100% of Teach, Gauntlet and Boss levels, and a sample of the rest (anything flagged off-target, plus 1 in 5 of the others). Each gets a thumbs up, thumbs down, or a "re-roll with next seed".
2. **Ordering**: within each world slot, sort generated levels by `D`, then apply the novelty-rhythm constraint (§6.3) and breather positions with a greedy pass.
3. **Live re-ordering**: after launch, calibrated difficulty (§8.8) may swap levels inside a slot between versions. Never across worlds.

### 8.8 Live calibration (Elo for puzzles)
Each player has a skill `θ` (start 1000). Each level has a rating `R` initialised from `D` as `R = 600 + 10·D`.
```
p     = 1 / (1 + 10^((R − θ)/400))          # predicted solve probability
s     = 1 if solved without hints within 3 attempts, else 0
θ    += Kp · (s − p)      # Kp = 32, decays to 16 after 200 levels
R    += Kl · (p − s)      # Kl = 4 (many players per level, so update slowly)
```
**Adaptive variants (mercy, not easy mode).** After 3 failed attempts on a level, the next variant comes from the lower third of that level's band, never outside ±tolerance. Complexity is preserved as promised, but a struggling player gets a slightly kinder version.

---

## 9. Rewards and economy

### 9.1 Currencies
| Currency | Earned from | Spent on |
|---|---|---|
| **Coins** | Level clears, in-level coins, daily modes | Echo unlocks, hints, cosmetics |
| **Shards** | Gems (first pick only), crowns, boss clears, daily streaks | Echo tier II/III upgrades, Oracle depth |
| **Stars** | ★1 clear · ★2 ≤ par + 25% · ★3 ≤ par | World gates (soft), milestone chests |
| **Crowns** | Beating canonical par (needs a bonus echo or a genuinely better line) | Prestige, Shards |

### 9.2 First-clear reward
```
C1(n)  = round(20 + 0.8·D(n))                           # 21 … 100 coins
coins  = C1(n) · starMult · (1 + 0.1·[no hints]) + inLevelCoins
starMult = {★1: 1.0, ★2: 1.25, ★3: 1.5}
```
Boss: ×3 plus 5 Shards. Gauntlet: ×2 plus 2 Shards. Crown: +3 Shards (once per level).

### 9.3 Replay rewards: decaying, capped, regenerating
State per (player, level): `k` = rewarded replays in the decay window, `life` = lifetime rewarded replays.
```
replayCoins(n, k, life, stars) =
    0                                          if life ≥ 10            # lifetime cap
    round(C1(n) · starMult(stars) · 0.5^(k+1)) otherwise               # 50%, 25%, 12.5%, …
    with k ≤ 2 per rolling 24 h                                         # daily cap: 3 paid replays per level

regen: every 8 h without replaying that level, k ← max(0, k − 1)        # "rested" recovery
starDelta: improving best stars pays (newMult − oldMult) · C1(n) in full, once per improvement
global: replay coins per day ≤ 600; past this, replays still give stars and XP but no coins
```
Also:
- Replays always serve a **new variant**, so memorised solutions don't pay.
- Replay coins only count if the run reaches ★2 or better. A sloppy ★1 replay gives XP only.
- In-level coins pay only on the first clear of each **variant**.

### 9.4 Unlock pacing (no forced grind)
World `w+1` opens when **both** hold:
1. The headline echo of `w+1` is unlocked (coins).
2. At least 30 of 50 levels in world `w` are cleared.

The unlock cost is set to **75% of world `w`'s total first-clear coins at a ★2 average**, so first clears alone always pay for progress:

| World | ★2 first-clear coins in world | Unlock cost of next world's echo |
|---|---|---|
| 1 | 1,710 | 1,280 (Mule) |
| 2 | 1,920 | 1,440 (Looking-Glass) |
| 3 | 2,120 | 1,590 (Lag) |
| 4 | 2,320 | 1,740 (Flicker) |
| 5 | 2,530 | 1,890 (Mason) |
| 6 | 2,740 | 2,050 (Keeper) |
| 7 | 2,930 | 2,200 (Sapper) |
| 8 | 3,140 | 2,350 (Contrarian) |
| 9 | 3,340 | 2,500 (Consensus) |
| 10 | 3,540 | 2,660 (Phantom) |
| … | grows ~205 per world | … |
| 19 | 5,370 | 4,020 (W20 pass) |

Leftover coins (25%+), replays and daily rewards go to **optional** purchases: shop echoes (Oracle, Gambit), tier upgrades (Shards), hints and cosmetics. This is where grinding pays off, so it feels rewarding without being required.

### 9.5 Daily, weekly and endless sinks and faucets
| Mode | Content | Reward |
|---|---|---|
| **Daily Echo** | One generated level, world-agnostic, same seed for everyone, using echoes the player owns (recipe drawn from owned set) | 150 coins + 1 Shard. Streak ×1.0 → ×2.0 over 7 days. One missed day drops the streak by 2, not to zero. |
| **Weekly Gauntlet** | 5 chained generated rooms, global leaderboard by total moves | Shards by percentile tier + cosmetic |
| **Rift** (endless, §10.3) | Escalating generated rooms with your loadout | Coins ≤ 400/day, Rift rank cosmetics |

### 9.6 Milestones and collection
- A **chest** every 10 stars, with fixed contents (no randomness and no paid boxes): coins, then a Shard every third chest, then a cosmetic every tenth.
- **Echo memories**: each echo has a 10-step "memory" track filled by using it in clears. Filling it unlocks cosmetics (trails, glyph skins) and lore fragments.

---

## 10. Modes

### 10.1 Campaign
The 1000 levels: canonical first, variants on replay. Stars, crowns, gates.

### 10.2 Daily and Weekly
See §9.5. Seeds are derived from `(UTC date)` and `(ISO week)` with a fixed salt.

### 10.3 Rift (roguelite endless)
- Pick 3 echoes from your unlocked roster. Each room is generated with `targetD = 20 + 6·room`, and its recipe is restricted to the loadout plus objects from worlds you have cleared.
- You have 3 **lives**. A loss or a stuck state costs one. Undo is limited to 5 per room.
- Between rooms, pick one of three **boons** (temporary perks drawn from the tier II/III perk table, Surge charge, +1 hop, B−1 for one echo).
- **Luck** returns here (v0.1 §11): coins in rooms fill Luck, and Gambit and Favour events use `p(L) = min(pmax, p0 + k·L/100)` with seeded RNG.
- Score = rooms × average stars. Rewards are daily-capped (§9.5).

---

## 11. Engine architecture changes

| Module | Change |
|---|---|
| `EchoController` | Echo built from `{selector, transform, verb, B, perks}`. Selectors and verbs are pure functions in registries: `SELECTORS[id](batch, echo, ctx) → dir | dirs | IDLE`, `VERBS[id](world, echo, dir, events)`. |
| `WorldRules` | Tile registry with hooks: `passable(actorClass)`, `onEnter(actor)`, `onLeave(actor)`, `onTick(tick)`, `pushTarget()`. Adding a tile type means adding a registry entry. |
| `StateHash` | Zobrist hashing with canonicalised unread buffer entries (§8.5). |
| `Solver` | BFS/IDA* in a Web Worker, sharing `step()` with the game. Also used for hints, stuck detection and variant phase verification. |
| `Content` | World packs are lazy-loaded JSON (RLE maps; about 200 B per variant, so about 2.4 KB per level with 12 variants and about 120 KB per world). Static hosting (GitHub Pages) is enough. |
| `Progress` | Local save `{stars, best, k, life, lastPlay, coins, shards, unlocks, tiers, streak}`, with optional cloud sync later. Reward functions are pure and unit-tested. |
| `Telemetry` | Opt-in. Per attempt: level, version, moves, undos, time, result, hints. Feeds §7.2 and §8.8. |

### 11.1 Selector reference implementation
```js
const SELECTORS = {
  HEAD: (b) => b[0],
  TAIL: (b) => b[b.length - 1],
  MAJORITY: (b) => {
    const c = {}; b.forEach((d) => (c[d] = (c[d] || 0) + 1));
    const max = Math.max(...Object.values(c));
    return b.find((d) => c[d] === max);           // earliest among ties
  },
  ODD: (b) => {
    const c = {}; b.forEach((d) => (c[d] = (c[d] || 0) + 1));
    return b.find((d) => c[d] === 1) || 'IDLE';
  },
  PENDULUM: (b, e) => (e.batchesDone % 2 === 0 ? b[0] : b[b.length - 1]),
  SUM: (b) => b.reduce((v, d) => [v[0] + DELTA[d][0], v[1] + DELTA[d][1]], [0, 0]), // vector
  MIRROR_OF: (b, e, ctx) => ctx.executed[e.source] || 'IDLE',
};
const D4 = { ID: [0, 1, 2, 3], MIRROR_X: [0, 3, 2, 1], MIRROR_Y: [2, 1, 0, 3],
             INVERT: [2, 3, 0, 1], ROT_CW: [1, 2, 3, 0], ROT_CCW: [3, 0, 1, 2] }; // index: UP,RIGHT,DOWN,LEFT
const compose = (g, f) => f.map((i) => g[i]);     // (g ∘ f)
```

---

## 12. Hints (solver-powered, monetised only in coins)
| Tier | Shows | Cost |
|---|---|---|
| Nudge | Highlights the next **pivotal object** on an optimal line from the *current* state | 30 coins or 1 hint token |
| Path | Next 4 moves | 80 coins |
| Reveal | Full remaining solution (blocks ★3 for this run) | 200 coins |

Players get 1 free hint token per day, plus tokens from chests. Hints are always computed from the current state, so they work mid-mistake. If the state is stuck, the hint says so and suggests an undo depth: the smallest `u` such that the state `u` moves back is winnable, found by searching backward through the undo stack.

---

## 13. Acceptance tests (in addition to v0.1 §19)
| Test | Expected |
|---|---|
| Selector purity | Every selector is deterministic and independent of wall clock and RNG. |
| D4 conjugation | For every shipped level and every g ∈ D4, the transformed level solves in exactly `L*` moves. |
| Necessity | For every level and every claimed mechanic, the ablated level is unsolvable within `L*+2`. |
| Variant band | Every variant has `|D − D_canonical| ≤ tolerance`, `|L* − L*_c| ≤ 15%`, and the same mechanic set. |
| Replay decay | Paid replays give 50%, 25%, 12.5%. The 4th within 24 h pays 0. The 11th lifetime pays 0. 8 h of rest restores one step. |
| Star delta | Improving ★1 → ★3 on a replay pays exactly `0.5·C1` once. |
| No forced grind | A simulated player clearing each world's first 30 levels at ★2 can afford every gate without replays. |
| Generator determinism | `generate(recipe, seed)` is byte-identical across runs and platforms. |
| Solver parity | The worker solver and the live `step()` agree on 10⁴ random playouts per world. |
| Stuck honesty | Stuck is reported only after an exhaustive search; budget exhaustion never shows a warning. |

---

## 14. Roadmap from the current prototype
1. **Engine refactor**: composition model (selectors, transforms, verbs), tile registry, Zobrist hash, solver in a Web Worker. Port the 10 prototype levels as W1 Teach/Show content.
2. **W1–W3 content**: handcraft the Teach and Show levels. Build the generator with `GATE`, `PIT_RUN` and `ESCORT` motifs. Ship 150 levels plus variants.
3. **Economy v1**: coins, stars, unlocks, replay decay, Daily Echo.
4. **Difficulty calibration**: telemetry and Elo, then re-fit the §7.2 weights.
5. **W4–W10**: add one world per update cycle. The Rift arrives with W6 (loadouts).
6. **W11–W20**: mutators, advanced hostiles, composed-echo generation for W20.

---

## 15. Open decisions
| Decision | Default | Validate by |
|---|---|---|
| World gate: 30/50 clears | 30 | Funnel drop-off per world |
| Replay decay base | 0.5 | Replay rates; coins/day distribution |
| Lifetime replay cap | 10 | Share of players hitting it |
| Variant tolerance | ±4 D | Elo spread between variants of one level |
| Mercy variants | Lower third after 3 fails | Quit rate vs. star inflation |
| Bonus echoes able to beat par (crowns) | Yes | Whether crowns feel earned or bought |
| Surge in campaign | 0–2 per level, deterministic | Whether players read it as a puzzle piece |
