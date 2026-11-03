# Visual polish and copywriting

Source: Vercel, "Web Interface Guidelines", https://vercel.com/design/guidelines (Design and copywriting sections). The copywriting rules are explicitly **Vercel brand preferences, not universal rules**; apply them only if the project has no voice guide of its own. Items marked **[agent note]** are my commentary.

## Visual details

- **Shadows:** use at least two layers to mimic ambient plus direct light.
- **Borders:** combine borders with shadows; semi-transparent borders sharpen edges.
- **Radii:** child radius no larger than the parent's, and concentric with it (inner radius = outer radius minus the gap).
- **Hue:** on tinted backgrounds, shift borders, shadows and text toward the same hue.
- **Interaction states:** hover, active and focus should have more contrast than the rest state.
- **Charts:** use color-blind-friendly palettes.
- **Contrast model:** Vercel prefers APCA over WCAG 2 for perceptual accuracy. **[agent note]** WCAG 2.x ratios (4.5:1 and 3:1; accessibility.md) remain the compliance standard referenced everywhere else in this skill; APCA is a candidate for a future WCAG version (verify current status). Use WCAG ratios as the floor and APCA as an optional extra check.
- **Browser chrome:** set `<meta name="theme-color">` to match the page background; set `color-scheme: dark` on `<html>` in dark themes.
- **Windows `<select>`:** explicitly set `background-color` and `color` to avoid dark-mode contrast bugs.
- **Gradient banding:** masks fading to dark can band; use background images instead.
- Optical alignment and icon-text lockups: see interaction-patterns.md.

## Typographic polish

Curly quotes; "…" character; avoid widows and orphans; tabular numbers for compared figures; non-breaking spaces for number-unit and key-combination pairs. (Details in interaction-patterns.md.)

## Copywriting (Vercel house style; use only when no other voice guide exists)

- Active voice and imperative verbs ("Install the CLI", not "The CLI will be installed").
- Title Case (Chicago style) for headings and buttons; sentence case on marketing pages.
- As few words as possible; "&" over "and".
- Consistent nouns; introduce few new terms.
- Second person, not first.
- Placeholders: `YOUR_API_TOKEN_HERE` for strings, `0123456789` for numbers.
- Numerals for counts ("8 deployments").
- Currency: 0 or 2 decimal places consistently within a context.
- Space between number and unit, non-breaking where possible.
- Positive, solution-focused tone even in errors.
- Errors explain the fix, not just the problem, and give a clear next action.
- Specific labels: "Save API Key" beats "Continue".

**[agent note]** The last three (tone, errors, specific labels) match universal usability advice and align with accessibility.md (error suggestion, labels); the others are stylistic choices.

## Agent checklist

- [ ] Shadows layered; radii concentric; borders and shadows hue-matched on tinted surfaces.
- [ ] Hover, active and focus states stand out more than rest.
- [ ] `theme-color` and `color-scheme` set; dark theme checked, including native controls like `<select>`.
- [ ] Charts color-blind safe.
- [ ] Copy follows the project's voice guide; if none, errors state the fix and labels are specific.
