# Aftermotion

A grid puzzle game built from `Aftermotion_Mechanics_Specification_v0.1.md`. Static HTML/CSS/JS, no build step, so it runs on GitHub Pages.

**Core idea:** your accepted moves are grouped into batches ("groups" in the game). Each echo copies only the *first* direction of every batch (Trace: batch 4, Flicker: batch 2). Plates, doors, push blocks, temporary blocks, helpers, a telegraphed Blocker enemy, Favour/cooldown, a bounded Hop and an Oracle preview combine across 110 levels.

## Play
Open `index.html`, or enable **Settings → Pages → Deploy from a branch** (root) or **GitHub Actions** (a workflow is included). Controls: arrows/WASD or swipe to move, `Z` undo, `R` restart, `F` favour, `H` hop (then tap a glowing tile), `O` oracle, `Esc` pause.

Screens: title, an 11-world map (110 levels, sequential unlock, stars), gameplay with animated batch tapes, echo collection, level-clear rewards. Coins come from first clears and decaying replays (50% → 25% → 12.5%, 3 paid replays, recharge one step per 8 h, 10 lifetime) and pay for solver hints (one free per day). Progress is saved in the browser. A **Daily Echo** (one of your cleared levels, ×2 coins at par, streak bonus) gives a reason to come back every day. Each world has its own colour theme; boss levels (every 10th) pulse through nearby hues, and every 5th level has a reactive floor that ripples with your moves.

**Shop & unlocks:** coins buy characters for your echoes: 68 hand-built SVG characters (`js/characters.js`: cats, a crowned King Cat, a glowing Neon King Cat, skulls, ghosts, robots, dragons and more) in four rarities. Their eyes follow their trace, they blink, cheer when they step, get dizzy when they bump, fall asleep when you stop and party when you win; a coloured platform and letter badge show the echo's kind. **Legendary items carry an aura** that changes the mood of the whole game (`js/ambient.js`, a full-screen canvas): Thunderstorm (rain, and lightning that strikes your echoes as they move), Inferno, Blizzard, Cosmos, The Code, Aurora, Sakura, Synthwave, Gold Rush and The Void. Orbs (16), trails (15, with step effects such as lightning bolts between tiles) and portals (14, including a Cosmic Eye that watches you) come in four rarities too. Auras can be turned off in Settings. Coins also buy orb colours, step trails, portal styles and boosts (hint packs, +3 moves, Lucky charm, Skip ticket). Some items are exclusive milestone rewards: clear a world, reach a 7-day Daily streak, or 3-star every level. The title screen and win screen always show the next unlock. Rules live in `js/shop.js` (unit-tested).

**Rewards** (full numbers in `docs/Rewards_Economy_Design.md`):
- **Clover**, a lasting Luck meter: echo steps and coins fill it, bumping echoes into walls drains it. When it is full, use a free Favour in any level.
- **Chests** (Bronze, Silver, Gold, Mythic) are earned every 3rd new level, every 10 stars, from bosses, world clears, streaks, quests and achievements. After a clear they descend glowing over the result screen; tap three times to burst them open.
- The **Rewards** screen holds:
  - daily quests;
  - the **Echo Quiz** (five engine-generated "where does the echo end up?" puzzles a day);
  - a **reward wheel** with odds and a pity timer;
  - the **Echo Garden** (your collection earns coins while you are away);
  - the chest queue, tiered achievements, stats and a list of every way to earn coins right now.
- A 7-day **gift calendar** greets you each day.
- Levels now and then lend you an unowned cosmetic for 8 moves (**try-on**), then offer it at 15% off.
- Legendary items need a milestone first (e.g. 150 stars), then 30,000–90,000 coins. They never drop from chests, so they keep their value.
- Anything locked says exactly why and how to unlock it.
- Cosmetics: 55+ orbs, 70 trails (16 of them animated, drawing glowing ribbons between tiles) and 53 portals, many generated from palettes in `js/cosmetics.js`.
- The first level of each mechanic plays a looping demo clip on its intro card (`js/demos.js`, driven by the real engine).

Naming: the basic echo is called **Echo**; Flicker, Mason and Keeper are other kinds of echo. An echo's **trace** is the dotted line and dashed square showing the step it will take next. Sound is synthesized with WebAudio; reduced motion is respected.

## Design docs
- `Aftermotion_Mechanics_Specification_v0.1.md`: original mechanics spec (what the prototype implements).
- `Aftermotion_Design_Specification_v0.2.md`: redesign: composable echoes, 1000-level plan, generator, variants, economy.
- `docs/Rewards_Economy_Design.md`: every reward system: states, motion, algorithms, triggers and the coin budget.

## Layout
- `js/engine.js`: deterministic simulation (spec §3, §5–§8, §9, §12, §14). No DOM, no RNG; timers count accepted player actions.
- `js/levels.js`: data-driven levels (legend in the file header).
- `js/main.js`, `css/style.css`: UI only (screens, DOM board, effects, input); reads state, sends commands.
- `js/progress.js`: rewards, stars, unlocks, hints, save data (pure, unit-tested).
- `js/shop.js`: cosmetics, boosts, legendary gates and milestone unlocks (pure, unit-tested).
- `js/cosmetics.js`: generated palette orbs, trails (static and animated) and portals.
- `js/rewards.js`: Clover, quests, achievements, chests, the reward wheel and level-clear bookkeeping (pure, unit-tested).
- `js/extras.js`: Echo Quiz, Echo Garden and the gift calendar (pure, unit-tested).
- `js/demos.js`: scripted demo clips for new mechanics (verified by tests).
- `js/characters.js`: SVG character kit and roster.
- `js/ambient.js`: aura weather and step/lightning effects.
- `js/audio.js`: synthesized sound effects.
- `tools/test.js`: spec §19 acceptance tests, reward rules, and a replay of every level's stored optimal solution (`node tools/test.js`).
- `tools/generate-levels.js`: the generator behind levels 61–110. It builds rooms from per-world recipes and keeps only levels that are solvable and need every taught element. Then it picks 10 per world in rising difficulty (`node tools/generate-levels.js <world> [tries] [seed]`, then `--apply`).
- `tools/check-levels.js`: the level quality gate. For each level it re-solves from scratch (proving it is winnable within its move limit and that `par` is optimal) and runs the `needs` ablations: with a taught element removed or frozen (an echo, crates, the hop, Favour), the level must become unsolvable. Run `node --max-old-space-size=6000 tools/check-levels.js [ids]` after editing levels; a few levels take up to a minute.

## Levels
110 levels in 11 worlds of 10 (First Light, Rhythm, Weight, Quickstep, Builders, Interference, Echo Chamber, Heavy Rhythm, Quicksilver, Workshop, Storm Front). Levels 61–110 are generated and solver-verified. Every level has a `lesson` (the one rule it teaches, shown on a lesson card before the first play and again after winning), an `intro`, a concrete `plan`, and a solver-proven `solution`/`par`. Levels 1-9 and 31/41 include short hands-on tutorial steps.

## Not yet implemented (later systems per spec)
Gambit/Oracle-as-echo, Saboteur/Pursuer/Trickster, toggle/timed/inversion plates, real-time timer mode, rewards/upgrades persistence beyond best scores.
