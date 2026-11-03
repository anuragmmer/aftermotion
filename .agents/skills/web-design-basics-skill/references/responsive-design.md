# Responsive design

Sources:
- UXPin, "Best practices and examples of excellent responsive design", https://www.uxpin.com/studio/blog/best-practices-examples-of-excellent-responsive-design/ (product promotion removed)
- Polypane, "Responsive design ground rules", https://polypane.app/blog/responsive-design-ground-rules/ (most precise on technique)
- BrandCoders, "The dos and don'ts of responsive web design", https://brandcoders.com/insights/the-dos-donts-of-responsive-web-design/ (qualitative, no numeric thresholds)

Items marked **[agent note]** are my commentary, including where sources conflict.

## What it is

One codebase that adapts layout, typography and media to the viewport. Three core techniques: **fluid grids** (relative units such as percentages or `fr`), **flexible media** (images and video that scale within containers), and **media queries**. Two now-standard additions: **container queries** and **fluid typography with `clamp()`**. Responsive layouts resize continuously; adaptive layouts switch between fixed layouts at set widths and can miss the gaps between (see spacing-grids-layout.md for the three layout strategies).

Why it matters: Google indexes the mobile version first, and responsive decisions drive Core Web Vitals (LCP load speed, CLS layout shift, INP interaction responsiveness). Typical mobile failures come from badly sized images, missing `width`/`height`, and unoptimized fonts.

## The ground rules (Polypane)

1. **Keep the viewport simple.** `<meta name="viewport" content="width=device-width" />`. Do not restrict user zoom or set min/max scale. Optionally add `viewport-fit=cover` for notched devices and keep content clear with safe-area insets on all four sides, adding spacing with `calc()`:
   ```css
   main {
     padding-right: calc(env(safe-area-inset-right) + 1rem);
     padding-left: calc(env(safe-area-inset-left) + 1rem);
   }
   ```
   (The inset values are exact, so content sits flush against the edge without the extra spacing.)
2. **Mobile first.** Write base styles for the smallest screen (usually one column) and add complexity at larger widths with `min-width` queries. Desktop-first needs extra CSS to undo desktop styles, causing overflow and text-fit bugs. Mobile first means less CSS, a faster site, and forces prioritization.
3. **Design from the content outward.** Fixed device breakpoints (320, 375, 768, 1024) go stale as new devices appear. Start small, widen until the layout breaks, and add a breakpoint there (an approach Polypane attributes to Stephen Hay). Aim for line lengths around **70 characters** (roughly 36 to 40em).
4. **Use ems in media queries,** not pixels, so layouts respond to user font-size changes and zoom. `@media (min-width: 44em)` (704px at a 16px base). Ems and rems behave the same in media queries; Polypane prefers ems (shorter, and notes rem rendering issues in Safari).
5. **Pick one direction.** Use only `min-width` or only `max-width` queries, never a mix or combined ranges. A new query then cannot affect earlier sizes, and you always know where to look when a layout misbehaves.
6. **Avoid fixed dimensions.** Size relative to surroundings (percentages, viewport units). Prefer `min-`/`max-` properties; `max-width: 100%` often fixes a fixed-width problem. (Same lesson as defensive-css.md.)
7. **Use modern layout:** flexbox, grid and container queries adapt to their container, so fewer media queries are needed and there is less to maintain.
8. **Leave slack for text rendering.** Do not put a breakpoint exactly where a line happens to wrap; browsers and operating systems render text at slightly different widths. Leave a few pixels of margin.
9. **Decide breakpoints in the browser,** not the design tool. A 750px artboard may need its switch at 44em (704px) once seen live.
10. **Workflow:** start with one narrow pane and design the smallest screen; widen until it breaks; read that width, convert to em; use it as the breakpoint, style it, repeat.

## Core techniques (UXPin)

**Fluid grid without media queries**
```css
.grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
```
Stacks to one column on mobile and expands on larger screens. **[agent note]** defensive-css.md prefers `auto-fill` because with `auto-fit` a lone item stretches across the whole row. Choose deliberately: `auto-fit` when few items should expand to fill the space; `auto-fill` when cards should keep a consistent width. Also, a `280px` minimum overflows on viewports narrower than 280px plus padding; `minmax(min(280px, 100%), 1fr)` avoids that (my addition).

**Container queries.** Viewport queries answer to the window; container queries answer to the parent's width, so a component adapts wherever it is placed. Set `container-type: inline-size` on the wrapper, then `@container (min-width: …)` on children. UXPin states they have been fully supported in modern browsers since 2024. **[agent note]** Verify against the project's browser targets.

**Fluid typography.** `clamp(min, preferred, max)` scales smoothly between a floor and a ceiling. UXPin examples: headings `clamp(1.75rem, 4vw + 0.5rem, 3rem)`; body `clamp(1rem, 1.5vw + 0.5rem, 1.25rem)`. **[agent note]** Keep a `rem` term in the preferred value (not viewport units alone) and confirm text still scales at 200% zoom (accessibility.md, WCAG 1.4.4).

**Flexible media**
- `max-width: 100%; height: auto` as the baseline.
- `srcset` and `sizes` to serve appropriately scaled files; resize to the dimensions the layout uses instead of shrinking huge files in CSS; compress.
- Always set `width` and `height` (or `aspect-ratio` on the container) to prevent layout shift.
- Prefer WebP or AVIF; lazy-load below-the-fold images; `fetchpriority="high"` on the LCP element (usually the hero image).
- SVG for icons and logos: scales without loss and responds to CSS color, easing theming and dark mode.
- See motion-and-performance.md for more image and font loading rules.

**Breakpoints.** UXPin's starting ranges: 360 to 480 (mobile portrait), 481 to 767 (mobile landscape), 768 to 1023 (tablet portrait), 1024 to 1279 (tablet landscape or small desktop), 1280+ (desktop); test both orientations. **[agent note]** UXPin itself says breakpoints belong where content breaks, and Polypane says device-based breakpoints go stale. Treat the table as a sanity check on common widths, not as the breakpoint list. Also design down to **320px** (WCAG reflow, accessibility.md), not just 360.

## Component and pattern guidance

- **Components, not pages:** make each component (button, card, form field) responsive on its own so it works in sidebars, modals, heroes and tables. In design systems, responsive behavior is a property of the component so every team inherits it. Inconsistency is a major failure source: the same component rebuilt with different breakpoints in different products.
- **Touch targets:** at least 44x44 (Apple) or 48x48 (Material); extend the tap area with padding instead of enlarging the visual; at least 8px between adjacent targets (see interaction-patterns.md for the reconciled rule).
- **Navigation:** collapse primary navigation into a menu on mobile and expand inline on desktop; keep at least one entry point (home, search or back) visible on mobile without interaction.
- **Progressive disclosure:** accordions, tabs, drawers and modals reveal secondary content on demand.
- **Do not hide content on mobile** (BrandCoders): users expect the same information everywhere, hidden content is hard to find (including navigation and calls to action), and the article argues it risks search visibility. **[agent note]** This is compatible with progressive disclosure: collapse or reorder content, but do not remove it.
- **Pop-ups:** do not overwhelm users; they interrupt, look spammy and lead to banner blindness. Use sparingly.
- **Too many fonts and colors** hurt cohesion and readability (also see visual-hierarchy.md).
- **Too many images or videos** slow loading, clutter the page and fail on limited bandwidth; use media purposefully and responsively.

### Pattern examples (UXPin)
- **News and content:** card grids collapse from four or five columns to a single stack; use `grid-template-areas` to reassign regions per breakpoint so hierarchy lives in CSS, not DOM order; keep the lead story prominent through size, not only position; nav becomes a drawer while content stays the same.
- **SaaS dashboards:** container queries switch charts at narrow widths (bar chart becomes a summary number card); data tables become card stacks on mobile, each row a card with labeled values.
- **E-commerce:** product image prioritized at every breakpoint, with price, reviews, options and CTA arranged around it; buy button fixed to the bottom of small viewports; filters and sort become a full-screen overlay or bottom sheet instead of a sidebar.

## Emerging techniques
`:has()` lets a parent respond to its children (change a card's layout if it contains an image). The View Transitions API gives native-feeling transitions between states and pages. AI-generated layouts can drift off-brand without access to the production design system's components.

## Testing
- DevTools emulation is fast but does not reproduce real touch, font rendering or network conditions.
- Lighthouse for Core Web Vitals.
- Test on real devices, especially mid-range Android phones (common worldwide and often under-tested), plus phones, tablets, laptops and desktops, portrait and landscape, and multiple browsers and versions. Test forms and navigation on each.
- Test plug-ins and third-party widgets across devices; update them regularly and watch page load time.
- Plan for maintenance: modular components, a CMS that non-technical staff can use, regular updates and patching (BrandCoders).
- BrandCoders also treats accessibility (font size, contrast, touch targets, alt text, captions, keyboard navigation) as a legal as well as ethical need; see accessibility.md.

## Agent checklist

- [ ] Viewport meta is `width=device-width` only; zoom never restricted.
- [ ] Base styles are the mobile layout; queries are `min-width`, in em, in one direction.
- [ ] Breakpoints chosen where the content breaks, with a few pixels of slack; works from 320px up.
- [ ] No fixed widths or heights on content boxes; modern layout (grid, flexbox, container queries) used before extra queries.
- [ ] Line length about 70 characters; fluid type uses `clamp()` with a `rem` term and survives 200% zoom.
- [ ] Images sized, `srcset`/`sizes`, explicit dimensions or `aspect-ratio`, modern formats, LCP image prioritized, others lazy.
- [ ] Components responsive on their own; tables on mobile reflow (cards) or scroll deliberately.
- [ ] Nothing removed on mobile; secondary content collapsed instead. One navigation entry point always visible.
- [ ] Safe-area insets handled if `viewport-fit=cover` is used.
- [ ] Tested on real devices in both orientations, including a mid-range Android phone.
