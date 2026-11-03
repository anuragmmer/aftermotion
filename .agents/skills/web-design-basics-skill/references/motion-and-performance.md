# Motion and performance

Source: Vercel, "Web Interface Guidelines", https://vercel.com/design/guidelines (Animations and Performance sections). Items marked **[agent note]** are my commentary. Specific thresholds are Vercel's recommendations, not universal standards.

## Motion

### When and why
- Animate only to clarify cause and effect, or for deliberate delight.
- Honor `prefers-reduced-motion` with a reduced variant (this is also covered in accessibility.md).
- Animations must be interruptible: user input can cancel them.
- Autoplay only muted, non-essential loops. Motion longer than 5 seconds alongside other content needs pause, stop or hide controls (WCAG 2.2.2).

### How to implement
- Prefer CSS first, then the Web Animations API, then a JavaScript library. Avoid main-thread JS animation where possible.
- Animate compositor-friendly properties: `transform` and `opacity`. Avoid animating `width`, `height`, `top` and `left`.
- **Never `transition: all`.** List the exact properties (typically `opacity` and `transform`).
- Match easing to what is changing (size, distance, trigger).
- Anchor motion to where it physically starts: set `transform-origin` accordingly.
- SVG: put transforms on `<g>` wrappers with `transform-box: fill-box; transform-origin: center;` to avoid Safari bugs.
- Text artifacts when scaling text: animate a wrapper; if needed add `translateZ(0)` or `will-change: transform`.
- Gradient banding on masks fading to dark: prefer background images.

## Performance

### Measure honestly
- Test on iOS Low Power Mode and macOS Safari as well as Chrome.
- Disable browser extensions that change runtime behavior while measuring.
- Profile with CPU and network throttling.
- Tools: React DevTools or React Scan for re-renders.

### Rendering and JavaScript
- Minimize re-renders and make the unavoidable ones fast.
- Batch layout reads and writes; avoid unnecessary reflow and repaint.
- Prefer uncontrolled inputs; keep controlled-input updates cheap.
- Move long tasks to Web Workers.
- Virtualize large lists (for example virtua) or use `content-visibility: auto`.

### Network and assets
- Latency budget: POST, PATCH and DELETE complete in under **500ms**.
- Images: preload only above-the-fold images, lazy-load the rest, set explicit dimensions to prevent layout shift (CLS).
- `<link rel="preconnect">` for asset and CDN origins (with `crossorigin` when needed).
- Fonts: preload critical fonts, subset with `unicode-range`, limit variable-font axes.
- Replace GIFs with `<video autoplay muted loop playsinline>` and provide a still alternative; honor reduced motion. For Safari, short non-essential loops can add an H.264 MP4 source inside `<picture>` gated by `prefers-reduced-motion`; use `<video controls>` when controls are needed or the content is essential.

## Agent checklist

- [ ] Every animation has a purpose and a reduced-motion variant.
- [ ] Only `transform` and `opacity` animated; no `transition: all`.
- [ ] Animations interruptible; nothing auto-plays with sound; long motion is pausable.
- [ ] Images sized, above-the-fold preloaded, others lazy; critical fonts preloaded and subset.
- [ ] Large lists virtualized; long tasks off the main thread.
- [ ] Mutations feel fast (under about 500ms) or show optimistic UI.
- [ ] Tested with throttling and on Safari.
