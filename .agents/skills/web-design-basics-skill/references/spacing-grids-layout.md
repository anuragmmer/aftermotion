# Spacing, grids and layout

Sources:
- Design Systems, "Space, Grids, and Layouts", https://www.designsystems.com/space-grids-and-layouts/ (does not cover breakpoints)
- Material Design 1, "Metrics and keylines", https://m1.material.io/layout/metrics-keylines.html (stand-in: the M2 "Spacing methods" page is script-rendered and could not be read. M1 is no longer maintained; treat its numbers as a well-known reference, not current Material 3 spec.)

## 1. Spatial system

A spatial system is a rule set for measuring, sizing and spacing UI elements. Every design system needs one. It makes the product consistent, cuts the number of daily spacing decisions, and gives engineers precise specs.

### Choosing the base unit
- Common bases: 4, 5, 6, 8 or 10. None is wrong; know the tradeoffs.
- **Recommended default (Design Systems article):** 8 for element sizing and spacing (a linear scale: 8, 16, 24, 32...), a 4 half-step for tight spacing around icons and small text, and a 4 baseline grid for type so line-heights divide by 4.
- Small bases (4, 5, 6) create too many near-identical options; people cannot tell 12 from 16 at a glance. 8 balances visible difference against manageable choices.
- Avoid odd bases such as 5: centering gets awkward and half-pixel positions blur (a 25px button cannot center its content on whole pixels). Scaling by 1.5x can cause the same blur.
- Pick density deliberately: spacious (large type, few actions) vs dense (data tables, expert tools). Decide before choosing the scale.

### Applying the scale
Apply it to padding, margin, height and width. Strict padding and strict height can conflict (20px line-height + 8px top and bottom padding = 36px, off an 8 scale). Resolve by picking a priority:
- **Element-first:** fix the size of predictable solid elements (buttons, inputs) on the scale. Padding flexes. These elements set the vertical rhythm.
- **Content-first:** when content is unpredictable (table cells with user data), enforce internal padding and let the element size follow the content.

### Borders
Design tools measure the element without its border; CSS depends on `box-sizing`. Use `border-box` (modern default) and agree with the team on one source of truth. Pixel-perfect alignment can cost simplicity and extensibility.

## 2. Material baseline numbers (dp = CSS px for web purposes)

- Components align to an **8 square baseline grid** on mobile, tablet and desktop.
- Toolbar/app-bar iconography aligns to a **4 grid**.
- Type aligns to a **4 baseline grid**.

Typical metrics from the Material 1 spec:

| Item | Mobile | Tablet |
|---|---|---|
| Screen edge margin | 16 | 24 |
| Content start when a left icon/avatar exists | 72 | 80 |
| Space between content areas | 8 | 8 |
| App bar / toolbar height | 56 | 64 |
| Status bar | 24 | 24 |
| Standard list item (one/two line) | 72 (with avatar), 48 (subtitle) | 64 / 72 |
| Floating action button | 56 | 56 |

Desktop inherits the mobile and tablet rules according to window size.

**Increments:** size and place elements in multiples of a base unit (for example the 56 app-bar height). Material uses this mainly on desktop, often on tablet, rarely on mobile. Examples from the spec: a card 8 increments wide, a right panel 5 increments wide.

**Ratio keylines:** preferred image aspect ratios are 16:9, 3:2, 4:3, 1:1, 3:4 and 2:3. Height = width / ratio.

**Touch targets (Material):** at least 48x48 with 8 or more between targets. Visible elements can be smaller than their target (a 40 avatar, a 24 icon or a 36-high button each sit inside a 48 target). 48 is roughly 9mm; the recommended physical range is 7 to 10mm.

> Note on conflicting sources: UXPin (button-states.md) says 44x44 minimum; Material says 48x48. They agree in spirit. Rule for the agent: **default to 48x48, never go below 44x44.**

## 3. Grids

Spatial rules define sizes and spacing; grids arrange content.

- **Column grid:** evenly spaced vertical columns. The space between columns is the gutter; make gutters follow the spatial scale. A **12-column** grid is the common choice because it splits evenly into halves, thirds, quarters and sixths.
- **Modular grid:** columns plus rows forming a matrix. Fits fixed formats (print); can fail in fluid responsive web layouts. It need not span the whole page.
- **Baseline grid:** originates in print as a rhythm for line spacing. On the web text is positioned by `line-height`, not by baseline, so choose line-heights that are multiples of the baseline unit (4) to keep vertical rhythm.

## 4. Layout strategies

Layouts combine spacing rules and grids. The hard part is keeping a clear hierarchy as screen size changes. Define scaling logic up front.

| Approach | Behavior | Good for | Cost |
|---|---|---|---|
| Adaptive | Distinct layouts per format (desktop/tablet/mobile) | Tailored experience per device | Expensive to build and maintain each |
| Responsive | Fluid, adapts continuously | Build once, works across sizes | Touch vs mouse differ; hard to cover every case |
| Strict | Fixed, does not flex | Preserving a specific interaction or information layout | Degrades when small; usually becomes scrollable (data tables, graphs) |

Designs often mix these (responsive page shell with a strict data table inside). Breakpoints, mobile-first and container queries are covered in responsive-design.md (this article's source does not cover breakpoints).

## 5. Rolling this out on an existing product (for review and refactor tasks)

Involve engineers, PMs and designers early and show each their benefit; start with small components (buttons) then siblings (form fields); let implementers help maintain the system; capture before/after evidence; set a completion date and milestones so the work is not left half-done.

## Agent defaults and checklist

Defaults to use unless the project says otherwise:
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 (multiples of 4, with 8 as the main step). Define as CSS custom properties (`--space-1` ... ), do not hardcode ad hoc pixel values.
- Line-height values divisible by 4 (for 16px body text: 24px).
- Page edge margin 16 on phones, 24 on tablets and up.
- 12-column grid for page layouts; gutters from the scale (16 or 24).
- `box-sizing: border-box` globally.
- Content-first padding for tables and user-generated content; element-first sizing for buttons and inputs.

Checklist:
- [ ] Every margin, padding, gap and size comes from the scale.
- [ ] No odd or arbitrary values (5, 7, 13, 25) unless justified.
- [ ] Line-heights fit the 4 baseline.
- [ ] Touch targets 48x48 (never under 44x44), with at least 8 between them.
- [ ] Layout strategy (adaptive, responsive, strict) chosen on purpose and stated.
- [ ] Hierarchy still reads at the smallest and largest widths.
- [ ] Pair with defensive-css.md: fixed-column grids behind a min-width media query, `min-width: 0` on grid/flex children.
