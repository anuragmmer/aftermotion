# Interaction patterns

Source: Vercel, "Web Interface Guidelines", https://vercel.com/design/guidelines (Interactions, Content and accessibility, Layout sections). Items marked **[agent note]** are my commentary, including where this conflicts with other references.

## Keyboard and focus

- Every flow must work by keyboard and follow WAI-ARIA Authoring Practices patterns.
- Every focusable element has a visible focus ring that nothing covers. Use `:focus-visible`, not `:focus`; use `:focus-within` for grouped controls. Sticky headers, footers, banners and overlays must not hide the focused element.
- Use focus traps where the pattern calls for them (modals) and move and restore focus as WAI-ARIA specifies.
- Shortcuts: account for non-QWERTY layouts and show platform-specific key symbols.
- Autofocus on desktop when there is one primary input; rarely on mobile, where the keyboard can shift layout.

## Hit targets and touch

- Minimum **24px** hit target for pointer use; smaller visuals need an expanded hit area. **44px minimum on mobile.**
- **[agent note]** Reconciling with other sources: UXPin 44, Material 48, Vercel 24 (pointer) and 44 (mobile). Rule for the agent: touch targets 48x48 by default and never under 44x44; pointer-only desktop controls never under 24x24 with adequate spacing.
- Inputs at least 16px font on mobile to avoid iOS Safari focus zoom (or set the viewport meta accordingly). **Never disable browser zoom.** **[agent note]** So fix zoom with the 16px font, not with `maximum-scale` or `user-scalable=no`.
- `touch-action: manipulation` on controls prevents double-tap zoom; set `-webkit-tap-highlight-color` to suit the design.
- No dead zones: anything that looks interactive must be interactive; checkbox and radio labels plus controls share one generous hit target.
- Be forgiving: generous hit areas, clear affordances, predictable behavior.

## State, navigation and links

- Keep UI state in the URL (filters, tabs, pagination, expanded panels) so share, refresh and Back/Forward work. Anything backed by `useState` that a user might want to return to should be deep-linkable.
- Back/Forward restores prior scroll positions.
- Navigation uses real `<a>` or framework `<Link>` so Cmd/Ctrl+click, middle-click and right-click work. Never use `<button>` or `<div>` for navigation.
- Set `scroll-margin-top` on headings that links jump to so sticky headers do not cover them.
- Every screen offers a next step or a recovery path. The page `<title>` reflects the current context.

## Feedback and loading

- **Loading buttons:** show a spinner and keep the original label. **[agent note]** This conflicts mildly with button-states.md, which allows replacing the label; prefer spinner beside the label.
- **Avoid flicker:** delay showing a loading indicator by about 150 to 300ms and, once shown, keep it visible about 300 to 500ms. React `<Suspense>` does this automatically.
- **Skeletons** match the final content exactly to avoid layout shift.
- **Optimistic updates:** update the UI immediately, reconcile with the server response, and on failure show an error and roll back or offer Undo.
- **Destructive actions:** require confirmation or provide Undo within a safe window.
- **Async announcements:** toasts and inline validation use `aria-live="polite"`.
- Use an ellipsis on menu items that open a follow-up step ("Rename…") and on in-progress labels ("Saving…"); use the single character "…", not three periods.
- Help: prefer inline explanations; tooltips are a last resort. **[agent note]** Note the tension with button-states.md, which suggests a tooltip explaining a disabled button; prefer visible helper text nearby, since tooltips on disabled controls are often unreachable by keyboard and touch.
- Tooltips: delay the first one in a group; adjacent peers then show with no delay.
- Design empty, sparse, dense and error states.

## Gestures, drag and input freedom

- Every drag, swipe, pinch or path gesture needs a click/tap and a keyboard alternative unless the gesture is essential.
- While dragging, disable text selection and apply `inert` to avoid stray selection and hover.
- Never block paste in `<input>` or `<textarea>`.
- Inputs must keep their focus and value after hydration (server-rendered frameworks).

## Scrolling

- `overscroll-behavior: contain` deliberately in modals and drawers (see defensive-css.md for scroll chaining).
- Desktop rubber-banding: inside `@media (pointer: fine)` set `overscroll-behavior: none` on `<html>`. Keep defaults on coarse-pointer devices to preserve pull-to-refresh. Test hybrid touch devices separately because `pointer` reports only the primary input. Note `none` also disables scroll chaining and native swipe navigation.
- Show only useful scrollbars and fix unintended overflow. On macOS, set scroll bars to "Always" to preview the Windows experience.

## Layout details

- **Optical alignment:** nudge by about ±1px where perception differs from geometry. Every element aligns to a grid, baseline, edge or optical center on purpose.
- **Lockups:** when text and icons sit together, balance weight, size, spacing and color (a thin icon may need a heavier stroke next to medium text).
- **Responsive testing:** mobile, laptop and ultra-wide (zoom a browser to 50% to simulate ultra-wide).
- **Safe areas:** use `env()` safe-area insets for notches.
- Size with flex, grid and intrinsic sizing, not JavaScript measurement (avoids layout thrash).
- Layouts handle short, average and very long user content (see defensive-css.md).

## Content and accessibility specifics

- Use native elements (`button`, `a`, `label`, `table`) before ARIA.
- Icon-only buttons always get a descriptive `aria-label`; decorative icons `aria-hidden`; check the accessibility tree.
- Do not rely on color alone for status; include text labels.
- Hierarchical `<h1>` to `<h6>` and a "Skip to content" link.
- Media: caption speech and meaningful sounds, transcripts for audio-only, describe essential visuals, hide decorative media from assistive tech, keep media controls keyboard operable.
- Format dates, times, numbers, separators and currency for the user's locale. Detect language from `Accept-Language` and `navigator.languages`, **never from IP or GPS**. Mark brand names, product names, code and identifiers `translate="no"`.
- Typographic polish: curly quotes, avoid widows and orphans, `font-variant-numeric: tabular-nums` (or a monospace font) for numbers that are compared, non-breaking spaces for glued terms ("10&nbsp;MB", "⌘&nbsp;+&nbsp;K").

## Agent checklist

- [ ] Fully keyboard operable; `:focus-visible` rings never covered by sticky UI.
- [ ] Hit targets: 48 touch (never under 44), 24 minimum pointer.
- [ ] Navigation is real links; filters, tabs and panels are in the URL.
- [ ] Loading indicators have show-delay and minimum duration; skeletons match final layout.
- [ ] Destructive actions confirmed or undoable; optimistic updates roll back on failure.
- [ ] Gestures have click and keyboard alternatives; paste never blocked; zoom never disabled.
- [ ] Toasts and inline validation announced with `aria-live="polite"`.
- [ ] Icon-only controls have accessible names; native elements preferred over ARIA.
- [ ] Locale formatting used; language not inferred from IP.
