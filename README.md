# Aftermotion

A grid puzzle game built from `Aftermotion_Mechanics_Specification_v0.1.md`. Static HTML/CSS/JS, no build step, so it runs on GitHub Pages.

**Core idea:** your accepted moves are grouped into batches. Each echo copies only the *first* direction of every batch (Trace: batch 4, Flicker: batch 2). Plates, doors, push blocks, temporary blocks, helpers, a telegraphed Blocker enemy, Favour/cooldown, a bounded Hop and an Oracle preview combine across 10 levels.

## Play
Open `index.html`, or enable **Settings → Pages → Deploy from a branch** (root) or **GitHub Actions** (a workflow is included). Controls: arrows/WASD move, `Z` undo, `R` restart, `F` favour, `H` hop (then click a tile), `O` oracle, `M` levels. Touch D-pad on mobile.

## Layout
- `js/engine.js`: deterministic simulation (spec §3, §5–§8, §9, §12, §14). No DOM, no RNG; timers count accepted player actions.
- `js/levels.js`: data-driven levels (legend in the file header).
- `js/main.js`, `css/style.css`: UI only; reads state, sends commands.
- `tools/`: `node tools/test.js` runs spec §19 acceptance tests and a BFS solver proving every level is solvable (`tools/solve.js`).

## Not yet implemented (later systems per spec)
Gambit/Oracle-as-echo, Saboteur/Pursuer/Trickster, toggle/timed/inversion plates, real-time timer mode, rewards/upgrades persistence beyond best scores.
