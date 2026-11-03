# Component systems, design tokens and style guides

Sources:
- UXPin, "Component-based design: complete implementation guide", https://www.uxpin.com/studio/blog/component-based-design-complete-implementation-guide/ (product promotion removed)
- Nielsen Norman Group, "Front-end style guides", https://www.nngroup.com/articles/front-end-style-guides/ (the fetched text listed only four of its "eight requirements"; those four are below)

Statistics in the UXPin article (percent fewer bugs, efficiency and collaboration gains, company figures) are unsourced and contradict each other in places, so they are left out. Items marked **[agent note]** are my commentary.

## Vocabulary

- **Component-based design:** build interfaces from reusable, self-contained parts for consistency, efficiency and scalability.
- **Component library:** central repository of reusable UI elements, each documented and regularly updated.
- **Design system:** a component library plus guidelines, standards and documentation.
- **Design tokens:** named values for color, spacing, typography and so on (for example `color.primary.500`) used instead of hard-coded values, so one change updates styles everywhere.
- **Front-end style guide (NN/g):** a modular, living collection of a product's UI elements with copyable code snippets, normally a web page rather than a PDF. It differs from a design-pattern library (broad design ideas) and from editorial style guides (writing rules) and branding guides (logos, palettes). It overlaps with branding because it includes colors and type. Some teams link it to the product so edits propagate; that is optional but enforces consistent use.

## Principles

- **Atomic design (Brad Frost):** atoms (buttons, inputs, labels), molecules (search bar, form field), organisms (navigation header, product card), templates (page layouts), pages (specific instances).
- **Composition:** components work alone and together with consistent style and behavior.
- **Props and variants:** expose configuration so one component serves many uses (a button with a `variant` prop defaulting to primary).
- **States:** define default, hover, active, disabled (and focus, loading; see button-states.md) for every component.
- **Tokens:** style from tokens across platforms.
- **Responsive behavior belongs to the component,** not the page (see responsive-design.md).

## Why a style guide helps (NN/g)

- **Efficiency:** designers spend less time on high-fidelity mockups; a sketch can reference existing components; realistic interactive prototypes can be assembled for usability tests or stakeholders.
- **Consistency:** when the consistent choice is the easiest one, people use it instead of inventing new variants.
- Most valuable in agile or lean teams where fast delivery makes efficient design workflows important.

## What a style guide should contain (NN/g)

1. A table of contents grouping components into findable categories.
2. Responsive layout or grid systems for placing common elements, with spacing at each size and placement rules (title bar and navigation consistently at the top) to avoid one-off screens.
3. The color palette, in the format each platform needs (HEX for web, UIColor for iOS).
4. Type styles (H1, body, caption) with typeface name and foundry, sizes, weights, line height, tracking and context of use.
(The fetched page showed only these four of its eight.)

For each UI element: **context of use** (when to use it instead of a similar one), **code snippets** (often in an accordion), **implementation specs** (position and spacing), and **dos and don'ts**.

### Commonly included components (NN/g starting list, not exhaustive)
Buttons, button groups, breadcrumbs, cards, tables, dialogs, grid lists, vertical lists, navigation menus and subnavigation, date and time pickers, progress and loading indicators, checkboxes, radio buttons, drop-downs, sliders, on-off switches, numeric steppers, form fields (with character count and required indicators), tabs, toolbars, tooltips, alert modals, icons, animations, tokens/chips. Include only what the product actually uses, plus any unique product elements.

## Implementation steps (UXPin)

1. **Audit** the UI for patterns and redundancy; set a component hierarchy and priority.
2. **Plan** states and variants, naming (the article suggests `Category-ComponentName-Variant`), configurable props and documentation needs.
3. **Document** usage guidelines and code examples per component.
4. **Review:** design critiques and accessibility checks (axe, WAVE for WCAG).
5. **Version control** in Git with a changelog.
6. **Distribute** through Storybook and published packages.
7. **Build in code:** components that read shared tokens; responsive styling.
8. **Cross-platform:** share the library across web and native where sensible (React Native is the article's example), tailoring to each platform.
9. **Pilot** on one project before scaling.

## Testing

Visual consistency across devices; behavior in every state; accessibility; performance impact; cross-browser; isolated testing in Storybook; automated visual regression testing for large libraries.

## Governance and versioning

- Regular cross-functional reviews (the article suggests every two weeks), clear guidelines and review checklists, scheduled audits, central resources (a monorepo as a single source of truth), performance and code-quality monitoring.
- **Semantic versioning** to signal the scope of change; **feature flags** for gradual rollout; **detailed changelogs**; **automated regression tests**; **migration guides and codemods** for major versions.
- Risks the article implies: no tokens leads to inconsistency; skipping the audit leads to redundant components; unversioned updates break dependent teams; manual QA becomes a bottleneck; AI-generated components need human review against the standards.

## [agent note] How the agent should use this

- Before building UI, look for an existing design system, component library or tokens in the project and use them. Do not create a one-off component where one exists.
- If none exists, define tokens as CSS custom properties (colors, spacing scale from spacing-grids-layout.md, type scale, radii, shadows) and build components from them.
- Give each component documented states and variants; keep responsive behavior inside the component.
- When adding a component, record when to use it versus a similar one (see component-usage-guidance.md for the pattern).
- Do not apply full design-system machinery (versioning, governance) to a small page; match effort to project size (same principle as architecture-and-planning.md).

## Agent checklist

- [ ] Existing system and tokens checked first; no hard-coded colors or spacing values.
- [ ] New components have defined states, variants, naming and a "when to use" note.
- [ ] Component responsive and accessible on its own.
- [ ] Accessibility checked with automated tools plus keyboard testing.
- [ ] Changes to shared components versioned and noted in a changelog.
