# Aftermotion

A grid puzzle game built from `Aftermotion_Mechanics_Specification_v0.1.md`. Static HTML/CSS/JS, no build step, so it runs on GitHub Pages.

**Core idea:** your accepted moves are grouped into batches ("groups" in the game). Each echo copies only the *first* direction of every batch (Trace: batch 4, Flicker: batch 2). Plates, doors, push blocks, temporary blocks, helpers, a telegraphed Blocker enemy, Favour/cooldown, a bounded Hop and an Oracle preview combine across 10 levels.

## Play
Open `index.html`, or enable **Settings → Pages → Deploy from a branch** (root) or **GitHub Actions** (a workflow is included). Controls: arrows/WASD or swipe to move, `Z` undo, `R` restart, `F` favour, `H` hop (then tap a glowing tile), `O` oracle, `Esc` pause.

Screens: title, a 6-world map (60 levels, sequential unlock, stars), gameplay with animated batch tapes, echo collection, level-clear rewards. Coins come from first clears and decaying replays (50% → 25% → 12.5%, 3 paid replays, recharge one step per 8 h, 10 lifetime) and pay for solver hints (one free per day). Progress is saved in the browser. A **Daily Echo** (one of your cleared levels, ×2 coins at par, streak bonus) and **star chests** (one every 10 stars) give reasons to come back. Each world has its own colour theme; boss levels (every 10th) pulse through nearby hues, and every 5th level has a reactive floor that ripples with your moves.

**Shop & unlocks:** coins buy characters for your echoes: 58 hand-built SVG characters (`js/characters.js`: cats, a crowned King Cat, a glowing Neon King Cat, skulls, ghosts, robots, dragons and more) in four rarities. Their eyes follow their trace, they blink, cheer when they step, get dizzy when they bump, fall asleep when you stop and party when you win; a coloured platform and letter badge show the echo's kind. Coins also buy orb colours, step trails, portal styles and boosts (hint packs, +3 moves, Lucky charm, Skip ticket). Some items are exclusive milestone rewards: clear a world, reach a 7-day Daily streak, or 3-star every level. The title screen and win screen always show the next unlock. Rules live in `js/shop.js` (unit-tested).

Naming: the basic echo is called **Echo**; Flicker, Mason and Keeper are other kinds of echo. An echo's **trace** is the dotted line and dashed square showing the step it will take next. Sound is synthesized with WebAudio; reduced motion is respected.

## Design docs
- `Aftermotion_Mechanics_Specification_v0.1.md`: original mechanics spec (what the prototype implements).
- `Aftermotion_Design_Specification_v0.2.md`: redesign: composable echoes, 1000-level plan, generator, variants, economy.

## Layout
- `js/engine.js`: deterministic simulation (spec §3, §5–§8, §9, §12, §14). No DOM, no RNG; timers count accepted player actions.
- `js/levels.js`: data-driven levels (legend in the file header).
- `js/main.js`, `css/style.css`: UI only (screens, DOM board, effects, input); reads state, sends commands.
- `js/progress.js`: rewards, stars, unlocks, hints, save data (pure, unit-tested).
- `js/shop.js`: cosmetics, boosts and milestone unlocks (pure, unit-tested).
- `js/audio.js`: synthesized sound effects.
- `tools/test.js`: spec §19 acceptance tests, reward rules, and a replay of every level's stored optimal solution (`node tools/test.js`).
- `tools/check-levels.js`: the level quality gate. For each level it re-solves from scratch (proving it is winnable within its move limit and that `par` is optimal) and runs the `needs` ablations: with a taught element removed or frozen (an echo, crates, the hop, Favour), the level must become unsolvable. Run `node --max-old-space-size=6000 tools/check-levels.js [ids]` after editing levels; a few levels take up to a minute.

## Levels
60 levels in 6 worlds of 10 (First Light, Rhythm, Weight, Quickstep, Builders, Interference). Every level has a `lesson` (the one rule it teaches, shown on a lesson card before the first play and again after winning), an `intro`, a concrete `plan`, and a solver-proven `solution`/`par`. Levels 1-9 and 31/41 include short hands-on tutorial steps.

## Not yet implemented (later systems per spec)
Gambit/Oracle-as-echo, Saboteur/Pursuer/Trickster, toggle/timed/inversion plates, real-time timer mode, rewards/upgrades persistence beyond best scores.
