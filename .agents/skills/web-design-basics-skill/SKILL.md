---
name: web-design-basics-skill
description: A field guide to building web pages and front ends well. Opinionated rules and checklists for planning, information architecture, layout and spacing, responsive design, forms, components, interaction, accessibility, resilient CSS, motion and performance. Use when creating, reviewing or refactoring any web page, site, component or front-end code, or when asked to make something robust, accessible, polished or production-ready.
---

# Web Design Basics Skill

A set of judgment calls and standards for building web interfaces, distilled from Vercel's Web Interface Guidelines, GOV.UK, W3C, MDN, NN/g, Material and other sources. It assumes you already know HTML, CSS and JavaScript; it tells you what to choose and what to avoid.

Read only the reference(s) that match the task. Do not load them all. Each ends with a checklist. Where the project already has its own conventions, components or tokens, follow those first.

## Principles

1. **Order the work by dependency;** size the process to the project (a small page needs no layers or ceremony).
2. **Structure before styling:** information architecture, hierarchy and navigation first.
3. **Dependencies point inward:** business logic does not import frameworks, databases or UI libraries.
4. **Design every state,** not just the default: default, hover, active, focus, disabled, loading, error, empty.
5. **Accessibility is a baseline:** visible focus, contrast in every state, never color alone, keyboard operable, correct labels.
6. **Assume content will not match the mockup:** long, short, missing and translated text must not break the layout.
7. **Hover is an enhancement;** nothing essential lives only in hover.
8. **Consistency inside a product:** define a pattern once, reuse it, draw spacing from one scale.
9. **Interruptions and weight cost users:** modals, popups, autoplay, heavy pages and extra choices all need a reason.

## Which reference to read

### Plan and architect
| Task | Read |
|---|---|
| Ordering work, critical path, layering code, module boundaries, state, component and module API design | `references/architecture-and-planning.md` |
| Custom elements, shadow DOM, slots, framework-agnostic components | `references/web-components.md` |
| CSS organization: BEM, OOCSS, SMACSS, Atomic, ITCSS, naming, specificity | `references/css-architecture.md` |

### Structure and layout
| Task | Read |
|---|---|
| Site/app structure, navigation, breadcrumbs, headings, multi-step flows, empty states | `references/information-architecture.md` |
| Spacing values, grids, margins, gutters, line-height, touch target size | `references/spacing-grids-layout.md` |
| Breakpoints, mobile-first, media and container queries, fluid type, responsive images | `references/responsive-design.md` |
| Ranking content, focal points, scanning patterns, CTA prominence | `references/visual-hierarchy.md` |
| Justifying a design choice: Hick, Fitts, Gestalt, Pareto, proportion conventions | `references/ux-laws-and-principles.md` |

### Components and interaction
| Task | Read |
|---|---|
| Button and control states | `references/button-states.md` |
| Form fields, labels, placeholders, validation, submit behavior | `references/forms-and-labels.md` |
| Choosing or specifying a component (inputs, radios, select, tabs, accordion, table, pagination, banners, tags), error wording | `references/component-usage-guidance.md` |
| Dialogs, modals vs nonmodal, confirmations, interruptions | `references/modals-and-dialogs.md` |
| Design systems, tokens, component libraries, style guides, versioning | `references/component-systems.md` |
| Keyboard and focus, links vs buttons, URL state, loading and optimistic UI, destructive actions, gestures | `references/interaction-patterns.md` |
| Animation, reduced motion, rendering speed, images, fonts, lists | `references/motion-and-performance.md` |
| Shadows, borders, radii, dark mode, microcopy | `references/visual-polish-and-copy.md` |

### Quality and robustness
| Task | Read |
|---|---|
| Layout CSS (flexbox, grid, images, scrolling) or hardening a component | `references/defensive-css.md` |
| Contrast, focus, errors, alt text, motion, text scaling, any accessibility review | `references/accessibility.md` |
| Page weight, third-party scripts, media and font loading, caching, hosting, deceptive patterns | `references/web-sustainability.md` |

## Default workflow

1. **Plan.** Clarify the goal, list tasks and dependencies, note external blockers.
2. **Structure.** Information architecture; architecture only if the project warrants it.
3. **Design.** Spacing scale, layout, components with all states and accessible labels.
4. **Build.** Defensive CSS defaults; follow the rules below.
5. **Verify.** Run the checklist of each relevant reference. Stress-test with extreme content and viewports; check keyboard use and contrast.
6. **Report.** Say what was done and what was not verified (for example real-device touch behavior).

## Rules that always apply

**Interaction and accessibility**
- Never remove `:focus-visible` styling without a visible replacement.
- Touch targets 48x48 by default, never under 44x44 (pointer-only desktop controls at least 24x24).
- Every form control has a visible `<label for>`; never placeholder-only.
- UI component borders and focus rings at least 3:1 contrast; layouts reflow at 320px and survive 200% text zoom.
- Descriptive link text, never "click here". Native HTML element first; custom element only when needed.
- Navigation uses real `<a>` links; filter, tab and pagination state lives in the URL.
- Do not pre-disable a form's submit; show errors beside the field plus an error summary, focus the first, keep the user's input.
- Never block paste or disable zoom. Hover styles inside `@media (hover: hover)`.
- Modals only for critical, irreversible or required-to-continue cases; never on page load or in checkout; prefer native `<dialog>` and return focus on close.

**Layout and CSS**
- Spacing from a scale (multiples of 4, main step 8) as CSS custom properties; unitless `line-height`.
- Buttons use `min-width`, not fixed width; boxes with variable text use `min-height`, not `height`.
- Images: `max-width: 100%`, `object-fit: cover`, reserved aspect ratio via `width`/`height` or `aspect-ratio`.
- Inputs at 16px minimum font size. Flex/grid children with long text: `min-width: 0`. Fixed-column grids behind a `min-width` query.
- Mobile first: `min-width` queries in `em`, one direction, breakpoints where content breaks; viewport meta `width=device-width` only; works from 320px.
- Follow the project's CSS convention (BEM, ITCSS, utilities); class selectors, no IDs, low flat specificity.
- Animate only `transform` and `opacity`, never `transition: all`; honor `prefers-reduced-motion`.

**Structure and design**
- One H1 per page; heading levels in order. One primary focal point per screen.
- Limit choices per decision point and group them; main navigation about 5 to 8 items.
- Use the project's existing components and tokens; no hard-coded colors or spacing, no one-off duplicates.

**Code and architecture**
- Imports point inward; no circular dependencies; depend toward stable code.
- Default to stateless handling; model ordered flows as explicit state machines.
- Component props: options objects with defaults, not positional booleans.
- Ship less: no autoplay, no unneeded third-party scripts, lazy-load media, honor user-preference media queries.
- When priorities conflict, user needs win over developer convenience; request the least data and permission needed.
