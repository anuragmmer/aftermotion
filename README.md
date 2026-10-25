# Aftermotion

A grid puzzle game built from `Aftermotion_Mechanics_Specification_v0.1.md`. Static HTML/CSS/JS, no build step, so it runs on GitHub Pages.

**Core idea:** your accepted moves are grouped into batches. Each echo copies only the *first* direction of every batch (Trace: batch 4, Flicker: batch 2). Plates, doors, push blocks, temporary blocks, helpers, a telegraphed Blocker enemy, Favour/cooldown, a bounded Hop and an Oracle preview combine across 10 levels.

## Play
Open `index.html`, or enable **Settings → Pages → Deploy from a branch** (root) or **GitHub Actions** (a workflow is included). Controls: arrows/WASD or swipe to move, `Z` undo, `R` restart, `F` favour, `H` hop (then tap a glowing tile), `O` oracle, `Esc` pause.

Screens: title, World 1 map (10 levels, sequential unlock, stars), gameplay with animated batch tapes, echo collection, level-clear rewards. Coins come from first clears and decaying replays (50% → 25% → 12.5%, 3 paid replays, recharge one step per 8 h, 10 lifetime) and pay for solver hints (one free per day). Progress is saved in the browser. Sound is synthesized with WebAudio; reduced motion is respected.

## Design docs
- `Aftermotion_Mechanics_Specification_v0.1.md`: original mechanics spec (what the prototype implements).
- `Aftermotion_Design_Specification_v0.2.md`: redesign: composable echoes, 1000-level plan, generator, variants, economy.

## Layout
- `js/engine.js`: deterministic simulation (spec §3, §5–§8, §9, §12, §14). No DOM, no RNG; timers count accepted player actions.
- `js/levels.js`: data-driven levels (legend in the file header).
- `js/main.js`, `css/style.css`: UI only (screens, DOM board, effects, input); reads state, sends commands.
- `js/progress.js`: rewards, stars, unlocks, hints, save data (pure, unit-tested).
- `js/audio.js`: synthesized sound effects.
- `tools/`: `node tools/test.js` runs spec §19 acceptance tests and a BFS solver proving every level is solvable (`tools/solve.js`).

## Not yet implemented (later systems per spec)
Gambit/Oracle-as-echo, Saboteur/Pursuer/Trickster, toggle/timed/inversion plates, real-time timer mode, rewards/upgrades persistence beyond best scores.
