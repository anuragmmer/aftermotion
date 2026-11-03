# Defensive CSS

Source: Ahmad Shadeed, Defensive CSS, https://defensivecss.dev/ (intro article plus 25 tips)

## The idea

Defensive CSS is a set of habits for writing CSS and designing components so they survive content they were not designed with. Layouts usually break not because of bad CSS but because real content differs from the mockup: longer or shorter text, images with other aspect ratios, translated labels, narrow or very wide screens, missing values, failed image loads.

Think of it as an advanced CSS reset plus a design mindset:
- **Designers**: design for unknown content. Show long, short, empty and error variants.
- **Developers**: set safe defaults up front instead of patching after bugs appear.
- **QA**: keep a checklist of content-driven failures and deliberately try to break the UI.

Default assumption for the agent: never trust the demo content. Ask "what happens if this is 5x longer, 5x shorter, missing, or in another language?" for every component.

## Quick-reference starter reset

```css
h1, h2, h3, h4, h5, h6, p, a { overflow-wrap: break-word; }
img { max-width: 100%; object-fit: cover; }
```

Add `scrollbar-gutter: stable` and `overscroll-behavior` per-component as needed (see below).

## Tips by theme

### Text and content length

**Long content** (user-generated text). Where the full text is not essential, truncate consistently:
```css
.username { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```
Do not truncate text the user must read in full.

**Component spacing.** Give text a gap from neighboring elements even when the current copy is short. A heading next to an action button needs a margin (for example `margin-right: 1rem`) so long titles never touch the button.

**Fixed sizes.** Do not fix `height` on boxes holding variable text; use `min-height` (hero sections are the usual victim). Do not fix `width` on buttons; use `min-width` so longer labels grow the button instead of crowding or overflowing.

**Button minimum width.** Short labels, especially in other languages (the source's example is "Done" vs its Arabic translation), can make a button tiny and hard to tap. Set a sensible `min-width` (about 90px in the source) so call-to-action buttons stay large enough, and let longer labels expand it.

### Images

**Distortion.** Unknown aspect ratios stretch images. Use `object-fit: cover` and, for consistent card thumbnails, `aspect-ratio`.

**Max width.** Put `max-width: 100%` on all images in the reset so they never overflow their container.

**Text over image.** If text sits on an image, give the `<img>` a background color so text stays readable when the image fails to load.

**Image inner border (avatars).** Light images disappear against light backgrounds (and dark ones in dark mode). Add a faint inner border. An `<img>` cannot take an inset box-shadow, so wrap it and overlay an absolutely positioned bordered element at low opacity (about 0.1).

**Background repeat.** Large background images tile on big screens by default. Set `background-repeat: no-repeat`.

### Flexbox

**Wrapping.** Flex items do not wrap by default and will overflow horizontally. Add `flex-wrap: wrap` for groups like option lists and breadcrumbs.

**Default stretching.** Flex items stretch to equal height. An avatar next to a long bio will stretch. Override with `align-self: start` on the item, or `align-items: center` on the parent.

**Minimum content size.** A flex item will not shrink below its content, so `overflow-wrap` alone fails on long unbroken strings. Set `min-width: 0` on the item (use `min-height: 0` in a column flex container).

**space-between.** `justify-content: space-between` looks odd when the item count changes (for example three items leaving a gap). Prefer `gap`, margins or padding.

### Grid

**Fixed values.** A fixed-column grid like `250px 1fr` breaks on small screens. Wrap it in a `min-width` media query (source example: 600px) so it only applies where there is room.

**Auto-fit vs auto-fill.** With `repeat(auto-fit, minmax(250px, 1fr))`, a lone item expands to fill the whole row. Usually `auto-fill` is what you want, because it keeps column tracks reserved and items at their intended width. (responsive-design.md uses `auto-fit` for fluid grids; the choice depends on whether few items should stretch or keep a consistent width.)

**Minimum content size.** Grid items also default to a minimum of their content, so a non-wrapping carousel inside a grid cell blows out the layout. Fixes (any one works): `min-width: 0` on the grid item, `minmax(0, 1fr)` instead of `1fr`, or `overflow: hidden` on the item.

**Sticky in grid.** Grid items stretch by default, which breaks `position: sticky` on a sidebar. Set `align-self: start` together with `position: sticky` and `top`.

### Scrolling

**Scroll chaining.** Scrolling past the end of a modal scrolls the page behind it. Add `overscroll-behavior-y: contain` (with `overflow-y: auto`) to the scrollable component (modals, chats, mobile menus).

**Scrollbar gutter.** A scrollbar appearing causes layout shift. Use `scrollbar-gutter: stable` to reserve the space.

**Scrollbars on demand.** Use `overflow: auto` (or `overflow-y: auto`), not `scroll`, so scrollbars appear only when content actually overflows.

### Responsive and input

**Vertical media queries.** Test height as well as width. Elements pinned with sticky/fixed positioning (such as a secondary nav at the bottom of a sidebar) can collide on short viewports. Gate such behavior with a height query (source example: `min-height: 600px`), or use auto margins for the push-to-bottom effect.

**Accidental hover on touch.** Half-taps while scrolling trigger hover styles. Wrap hover styles:
```css
@media (hover: hover) { .card:hover { /* hover styles */ } }
```

**iOS Safari input zoom.** Focusing an input with a font size under 16px zooms the page and does not zoom back. Set `font-size: 16px` on inputs.

### CSS robustness

**Variable fallback.** When a custom property might be undefined (for example set by JavaScript that failed), provide a fallback: `calc(100% - var(--actions-width, 70px))`, `var(--brand-color, lightblue)`.

**Vendor selectors.** Never group vendor-prefixed selectors into one rule (such as the webkit and moz placeholder pseudo-elements). One unrecognized selector invalidates the whole rule. Write separate rules.

## Pre-ship stress test

Run each component through:
- [ ] Very long text, long unbroken strings, very short text, empty values
- [ ] Non-English text and RTL languages
- [ ] Images with wrong aspect ratio, tiny images, failed loads
- [ ] 1 item vs 2 vs many in lists and grids
- [ ] Narrow width, wide width (ultra-wide), short height
- [ ] Touch device behavior (hover, input zoom)
- [ ] Content that makes a container scroll (gutter, chaining)
- [ ] JavaScript-provided CSS variables missing

## Notes for the skill author

- Several tips are only partly specified in the source (vertical media query gives the threshold but no code; the auto-fit/auto-fill author's preference is an opinion, "most of the time" rather than a rule).
- Browser support for `scrollbar-gutter` and `overscroll-behavior` should be re-checked before the skill states them as universally safe.
- `gap` in flexbox: the source says "use with caution" (older browser support concerns), which is likely outdated by now. Verify before keeping that caveat.
