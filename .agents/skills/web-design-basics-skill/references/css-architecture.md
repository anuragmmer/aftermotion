# CSS architecture methodologies

Source: Valorem Reply, "5 methodologies for architecting CSS" (Nov 2020), https://www.reply.com/valorem-reply/en/resources/insights/blog/2020/november/5-methodologies-for-architecting-css

The article is a short overview: it gives no code (diagrams only) and no cons. It names the goals: maintainability, scalability and DRY. It recommends following one methodology closely or combining ideas into your own naming conventions. A "reduced CSS bugs by 40-60%" claim on the page has no source and is omitted. Items marked **[agent note]** are mine, drawn from general practice, not the article.

## 1. BEM (Block, Element, Modifier)

Component-based: split the UI into independent blocks and make the HTML-CSS relationship explicit.
- Use **classes, not IDs**; all selectors carry equal weight, so overrides are easy.
- **Block:** an independent component (`search`). **Element:** a functional part of a block (`search__input`). **Modifier:** a variation (`button--red`, `search__input--large`).
- Fits component-heavy front ends that need consistent naming.

## 2. OOCSS (Object-Oriented CSS)

Treat page elements as reusable objects; build stylesheets from them.
1. **Separate structure from skin:** repeated visual features become standalone skins applied to different objects.
2. **Separate container from content:** avoid location-dependent styles and deep child selectors, so an object looks the same wherever it is placed.
- Benefits: heavy reuse, smaller faster stylesheets, easier maintenance. Use when reuse and flexibility are the priority.

## 3. SMACSS (Scalable and Modular Architecture for CSS)

Organize CSS (and folders) by responsibility:
- **Base:** defaults for bare elements. **Layout:** major page sections. **Module:** reusable independent fragments (a nav bar). **State:** conditional variations (expanded/collapsed). **Theme:** shared visual rules (colors, shapes, borders, shadows).
- Good for larger projects where folder structure should show responsibility.

## 4. Atomic CSS

Small single-purpose classes named for their visual function; style by composing them.
- Benefits: less redundancy, fewer specificity conflicts, predictable styling, low barrier to entry. Cost: more classes in the markup. Longhand names read better; shorthand is shorter.

## 5. ITCSS (Inverted Triangle CSS)

Layer global CSS from least to most specific so specificity only rises:
1. **Settings** (variables) 2. **Tools** (mixins, functions) 3. **Generic** (normalize/reset) 4. **Elements** (bare HTML) 5. **Objects** (containers, wrappers, rows) 6. **Components** (most UI) 7. **Utilities** (overrides that win over everything).
- Imposes no naming scheme. Best for taming specificity and complexity.

## Choosing and combining

| Need | Lean toward |
|---|---|
| Clear naming for components | BEM |
| Reuse, small CSS | OOCSS, Atomic |
| Folder/responsibility structure on a big project | SMACSS |
| Control over specificity and cascade order | ITCSS |
| Fast, predictable styling by non-CSS specialists | Atomic |

**[agent note]**
- The methods combine well: ITCSS ordering for the cascade, BEM names inside the Components layer, a few Utilities at the end. SMACSS "State" maps to BEM modifiers or `is-*` classes.
- **Follow the project's existing convention first.** Do not mix a second naming scheme into an established codebase; check for Tailwind or CSS Modules before choosing.
- Modern CSS adds tools the article predates: custom properties for the Settings layer, `@layer` to make ITCSS-style ordering explicit, and `:where()` to lower specificity. Tokens belong in component-systems.md.
- Keep selectors flat and low in specificity, avoid IDs and `!important` (except deliberate utilities), and keep layout CSS defensive (defensive-css.md).
- Sizing: a one-page site needs a small, consistent convention, not a full architecture (same caution as architecture-and-planning.md).

## Agent checklist

- [ ] Existing methodology identified and followed; if none, one chosen and written down.
- [ ] Class selectors only for styling; no IDs; specificity kept low and flat.
- [ ] Names show structure (block/element/modifier or equivalent) and are consistent.
- [ ] Cascade order deliberate (settings, base, layout/objects, components, utilities).
- [ ] Reused visuals extracted once (tokens, skins, utilities), not copy-pasted.
- [ ] Component styles do not depend on where the component is placed.
