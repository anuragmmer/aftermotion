# Visual hierarchy

Sources:
- The Decision Lab, "Visual hierarchy", https://thedecisionlab.com/reference-guide/design/visual-hierarchy
- Interaction Design Foundation, "Visual hierarchy", https://ixdf.org/literature/topics/visual-hierarchy

Unverified statistics quoted in the sources (ad-viewing study, eye-movement research) are omitted. Items marked **[agent note]** are my commentary.

## What it is

Arranging elements so people can see their relative importance and know where to look first. Contrast in size, shape, position or other traits makes some elements stand out and read as more important. Without hierarchy everything competes equally and the eye wanders. Good hierarchy guides attention, reduces confusion and builds trust. It also shows relationships between content blocks: highest priority first, then the rest in descending order.

Rooted in Gestalt psychology: the brain organizes visual input into structured wholes, which is why proximity, grouping and alignment shape how a layout is read.

## The cues (use them to rank, not decorate)

| Cue | How it works |
|---|---|
| **Size / scale** | Larger reads as more important (a 44pt headline before a 12pt footnote; the "add to cart" button bigger than size selectors). |
| **Color** | Bright or saturated colors draw the eye over muted ones. Reserve them for strategic items such as primary calls to action. Rough ranking: bright, then rich/dark, then light tints, then grayscale. Overusing bright colors dilutes the signal. |
| **Contrast** | Light vs dark, bold vs thin, from color, size, weight or shape. Also supports accessibility. |
| **Alignment** | Consistent alignment gives structure and reading flow; one off-axis element stands out. Items at the start of a row or column read as more important (key navigation at the far left). Left-aligned body text typically reads faster than centered. |
| **Repetition** | Repeated shapes, colors and styles signal related content (hyperlinks are the classic case). |
| **Proximity** | Close items group; distant items separate. Labels sit near their inputs. |
| **White (negative) space** | Frames and emphasizes key content, cuts clutter, improves comprehension. It does not have to be white. |
| **Texture and style** | A rich illustration outweighs a flat icon; keep textures in tune with the design's tone and not busy enough to distract. |
| **Typography** | Size, weight, style and spacing separate headings from body text. |

## Scanning patterns

- **F-pattern:** across the top, down the left side, then across again. Typical of text-heavy pages.
- **Z-pattern:** top left to top right, diagonally to bottom left, then across to bottom right. Typical of low-text pages (small promo sites).
- Patterns follow reading direction: right-to-left languages such as Arabic mirror them. A site may mix them (Z on a clean homepage, F deeper in).
- Cultures and audiences differ; do not assume one hierarchy suits all.

## How to build a hierarchy (step by step)

1. Respect natural scanning patterns: put key information where eyes go.
2. Create deliberate focal points; break the pattern on purpose to highlight one critical item (a bold statistic surrounded by space).
3. Favor recognition over recall: headers, bullets and bold make content scannable.
4. **Rank importance.** Decide what matters most and scale the rest down. Equal emphasis on everything is visual noise.
5. Use typographic levels: large header for the core idea, medium sub-header for context, body for detail. A guideline often cited is a **3:1 header-to-body size ratio** (for example 48 over 16). Treat it as a starting point.
6. Stay consistent; consistent icons, colors and heading styles build trust.

## Design tips

- Placement alone is not enough: the most important element must be the most noticeable. Top placement suits navigation and primary calls to action, but a colored button mid-page can be a focal point too.
- Limit fonts: one or two families; build hierarchy through weight, size and style.
- Spacing groups content: the gap between a title and its content should be smaller than the gap separating it from the previous block, and the gap between sections larger than the gap between paragraphs. **[agent note]** (The source says space between a title and content should exceed space between paragraphs; it describes visual separation of a title from the block it introduces. Follow the principle of "closer means related" and verify visually.)
- Structure text for scanning: short paragraphs, bullets for complex ideas, bold or color sparingly.
- Tappability cues and well-placed animation (a pulsing button) guide users to expected actions; avoid ambiguous elements that cause uncertainty.
- UI typography: an H1 to H6 heading structure; line and letter spacing that is too tight or too loose both hurt readability.

## Do

- Rank elements and scale the rest down.
- Use contrast, size and color to direct attention to actions.
- Group related items with proximity and repetition.
- Use white space to separate and emphasize.
- Keep styles consistent across screens.
- Check contrast and accessibility.

## Do not

- Give every element equal weight.
- Overuse bright colors.
- Mix many fonts or inconsistent styles.
- Rely on placement alone to signal importance.
- Hide core navigation behind scrolling or an icon just to showcase visuals; it confuses users, especially older ones.
- Make important controls hard to see.
- Copy another brand's hierarchy; Apple's minimal product-focused layout and Amazon's dense catalog layout both work for their own goals.

**The biggest hierarchy breaker is inconsistency:** shifting fonts, colors, sizes or layouts make users doubt where to look and erode trust.

## Accessibility caution

Simple hierarchies help users with visual or cognitive impairments, but elements meant to recede (low-contrast secondary text) can become invisible to low-vision users. De-emphasize with size, weight and position first, and keep secondary text above the contrast minimums in accessibility.md (4.5:1 for text, 3:1 for UI components).

## Related: dark patterns

Dark patterns deliberately obscure information to mislead users; they are the manipulative opposite of hierarchy's goal of helping people find and understand things. Never use hierarchy to hide the cancel action, bury costs or push users toward an option they would not choose with clear information.

## Presentations and slides (brief; the source extends the topic here)

- One core idea per slide; spoken detail goes in notes or a handout.
- Reveal content step by step (progressive disclosure).
- Insight-driven headlines (a specific finding) beat generic labels ("Key Findings").
- Plenty of white space; avoid cramming.
- Visuals (icons, charts, photos) over paragraphs.
- At most two fonts (headings, body) and consistent brand colors; check contrast and color-blind safety.
- Examples: swap a dense paragraph and ten equal bullets for a headline stating three insights with large numbers; replace a raw-number table with one headline percentage and a simple bar chart.
- Adapt to context: one-way updates (simple, one takeaway), workshops (participatory layouts), online (progressive disclosure), in person (large visuals readable from the back), email (bold headlines and scannable formatting).

## Agent checklist

- [ ] One clear primary focal point per screen or section; secondary and tertiary levels visibly lower.
- [ ] Hierarchy built with at least two cues (for example size plus weight), not only color.
- [ ] Primary call to action is the most prominent interactive element; destructive or rare actions are quieter.
- [ ] Heading levels are visually distinct and in order; at most two font families.
- [ ] Related items are grouped by proximity; gaps follow the spacing scale (spacing-grids-layout.md).
- [ ] Consistent styling for the same kind of element everywhere.
- [ ] De-emphasized text still meets contrast minimums.
- [ ] Layout checked for the product's reading direction and audience.
- [ ] Hierarchy is not used to obscure options or costs.
