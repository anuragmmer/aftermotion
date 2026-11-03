# UX laws and design principles

Source: Simon Whatley, "11 laws and principles to use in design", https://www.simonwhatley.co.uk/writing/11-laws-and-principles-to-use-in-design/

This is a general-audience overview, not a research review. Some entries (Fibonacci, golden ratio, rule of thirds) are aesthetic conventions without strong usability evidence; I label how firmly each should be applied. Items marked **[agent note]** are my commentary and cross-references. **This file does not yet include Nielsen's usability heuristics**; those need a separate source.

## How to use the laws

Use them to explain and sanity-check design decisions, not as pass/fail rules. When two laws pull in opposite directions (simplicity vs completeness), user testing decides.

## Usability laws (apply firmly)

### Hick's Law
Decision time grows with the number of choices. More options also make any single option less likely to be chosen.
- Apply to navigation and calls to action: reduce options, group them into a few high-level choices, reveal more only as users go deeper.
- The article suggests roughly **6 to 8 main navigation links** as a guide. **[agent note]** information-architecture.md says 5 to 7; treat the range as 5 to 8 and prefer fewer.

### Fitts' Law
Speed and accuracy of hitting a target depend on its size and the distance to it, for both touch and cursor.
- Make links and buttons as large as the layout allows; keep frequently used controls close together to cut movement.
- **[agent note]** This is the principle behind the touch-target minimums in interaction-patterns.md and accessibility.md.

### Occam's Razor (simplicity)
Among otherwise equal options, prefer the one with the fewest assumptions.
- Deliver only what users need and remove the rest; start from the actual screens users will see and build backward; iterate, keep the cost of change low, and keep improving after launch.
- **[agent note]** Also the rationale for "test without the component first" in component-usage-guidance.md.

### Pareto principle (80/20)
Roughly 80% of effects come from 20% of causes.
- Find the 20% of features used 80% of the time and focus design and testing there; find the critical 20% that drive most revenue and prioritize them; use it to decide what to redesign, downplay or drop; stop optimizing beyond the critical few, where returns diminish.
- **[agent note]** Treat the 80/20 split as a heuristic, not a measured fact for any given product; confirm with usage data.

### The magical number 7 ± 2 (working memory)
Early research suggested working memory holds about 7 ± 2 chunks. The article notes later research found the span varies: about seven for digits, six for letters and five for words; shorter words are easier; and verbal span depends on how long the content takes to say.
- The article gives no direct design rule. It is closest to the advice to limit navigation options (Hick's Law).
- **[agent note]** Use it as a rough reason to chunk content (group form fields, break long codes into groups, paginate), not as a hard limit.

### Miller's Law (communication principle)
Listed separately in the article: suspend judgment so you understand what someone is saying before interpreting it through your own views. No design example is given.
- **[agent note]** Two different ideas are attributed to George Miller in this article: this communication principle and the working-memory span above. UX writing usually means the working-memory idea when it says "Miller's law". Applied to design work, this one is a reminder to understand user feedback on its own terms before reacting.

## Perception principles (apply firmly; they explain layout)

### Gestalt
The brain processes information holistically and tends to organize it. Key ideas:
- **Emergence:** complex patterns arise from simpler rules.
- **Reification:** perception adds information beyond what the senses receive.
- **Multi-stability:** ambiguous images flip between interpretations.
- **Invariance:** shapes remain recognizable despite changes in rotation, position, scale or lighting.

### Prägnanz (law of simplicity of perception)
Perception prefers the simplest, most stable interpretation. Six sub-laws:
- **Closure:** the mind completes missing parts of a figure.
- **Similarity:** alike elements (form, color, size, brightness) group together.
- **Proximity:** nearby elements read as a unit.
- **Symmetry:** symmetrical shapes are perceived together, even from far away (the article ties this to figure-ground relationships).
- **Continuity:** the mind extends visual, auditory and motion patterns.
- **Common fate:** elements moving the same way read as one group.
- Application from the article: similarity and proximity guide how radio buttons are placed. **[agent note]** Same grouping logic as visual-hierarchy.md (proximity, repetition) and the fieldset advice in component-usage-guidance.md.

## Proportion conventions (optional starting points, weak evidence)

### Fibonacci sequence
Each number is the sum of the previous two: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144. The article says it recurs in nature (branching, leaf arrangement) and is often visualized as growing squares; it is closely tied to the golden ratio. **[agent note]** The sequence is a convenient source of spacing and size steps (8, 13, 21, 34), but spacing-grids-layout.md's 4/8-based scale is the project default.

### Golden ratio
About 1.618: the whole divided by the larger part equals the larger part divided by the smaller. The article suggests using golden-ratio rectangles for captions, text beside images, ad space, and navigation buttons and menus, and planning layouts with a Fibonacci spiral of squares (1, 1, 2, 3, 5, 8, 13, 21, 34). **[agent note]** Use for proportions only when no better constraint exists (for example a sidebar-to-main width); do not override content needs or the spacing scale for it.

### Rule of thirds
Divide a composition into nine equal parts with two horizontal and two vertical lines; place key elements on the lines or at the four intersections. On web pages using all four points is usually impractical; use one or two to place the most important message or function. The article says the upper-left point is typically strongest because of F-pattern scanning (see visual-hierarchy.md). **[agent note]** Most useful for hero imagery and photo cropping.

## Agent checklist

- [ ] Choices per decision point limited and grouped (Hick); primary action obvious.
- [ ] Frequent targets large and close to where the pointer or thumb already is (Fitts).
- [ ] Features cut or demoted by usage evidence, not opinion (Pareto, Occam).
- [ ] Related items grouped by proximity and similarity; unrelated items separated (Gestalt).
- [ ] Long data chunked (codes, phone numbers, long forms) rather than shown as one string.
- [ ] Proportion conventions (golden ratio, thirds) used only as optional starting points.
