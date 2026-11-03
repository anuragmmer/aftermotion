# Web components

Sources read:
- MDN, "Web components", https://developer.mozilla.org/en-US/docs/Web/API/Web_components (overview and API reference; no code examples; its browser-compatibility tables did not come through)
- CSS-Tricks, "Web Components Demystified", https://css-tricks.com/web-components-demystified/ (practical detail, caveats, styling)


Items marked **[agent note]** are my commentary or synthesis. Library sizes and "no official SSR story" claims are the CSS-Tricks article's and may be dated.

## What they are

Not a single built-in element but a set of standards (HTML, CSS, JavaScript) for making custom elements with encapsulated behavior. They solve the problem of reusing custom markup that otherwise needs complex HTML, CSS and JS that can collide when used repeatedly on a page. Unlike framework components (React-style) that act like partials swapped out at render time, web components are **real HTML elements** and must obey HTML rules. The recommended mindset is **HTML-first**: ship meaningful markup, then enhance it.

Three ingredients:
1. **Custom elements:** your own elements, with names containing a dash, defined through JavaScript APIs.
2. **Shadow DOM:** an encapsulated DOM subtree (own markup and styles) that keeps internals private so styles and IDs do not collide with the page.
3. **HTML templates and slots:** `<template>` (inert markup, not rendered) and `<slot>` (placeholder filled by the user's markup).

## Basic steps (MDN)

1. Write a class describing the behavior.
2. Register it with `customElements.define(name, Class)` (global registry on `window.customElements`; a scoped registry can be created with the `CustomElementRegistry()` constructor to avoid name clashes).
3. If needed, attach a shadow root with `attachShadow()` and build its content with regular DOM methods.
4. If needed, define a `<template>` with `<slot>`s, clone it and attach it to the shadow root.
5. Use the element anywhere like any HTML element.

```js
class MyElement extends HTMLElement {}
customElements.define("my-element", MyElement);
```

## Custom elements

- Names must contain a dash, cannot be void elements, and cannot reuse reserved MathML or SVG names.
- Undefined elements are valid HTML, so before JavaScript runs they work as styling hooks and containers.
- **Lifecycle callbacks:**
  - `constructor()`: set up initial state and listeners; call `super()` first; you cannot inspect the parent yet.
  - `connectedCallback()`: runs when the element is added to the page; attach event listeners here.
  - `disconnectedCallback()`: clean up (stop animations, release references).
  - `adoptedCallback()`: element moved to another document.
  - `attributeChangedCallback()`: fires for attributes listed in `static observedAttributes`.
- A script that runs before the DOM is parsed may see missing child nodes; `type="module"` defers the script.
- **Attributes are strings, not props.** Avoid names that clash with standard attributes (such as `type`); use `data-*` attributes.
- **Do not extend built-in elements** (`extends: "p"` with the `is` attribute). MDN documents customized built-ins, but CSS-Tricks calls this a dead end because WebKit will not implement it. **[agent note]** Prefer autonomous custom elements.

## Templates

`<template>` content is not rendered. Read its fragment via `.content`; use `cloneNode(true)` for every instance (without cloning, the fragment can be used once). Combine with a loop to stamp list items from data.

## Shadow DOM

- **Declarative:** `<template shadowrootmode="open">` inside the host. **Imperative:** `this.attachShadow({ mode: "open" })` in the constructor, then fill `shadowRoot`.
- **Open** mode exposes `element.shadowRoot` to JavaScript; **closed** does not.
- **Slots** project light-DOM content into the shadow tree. Without a slot, children after a shadow root do not render. React to changes with the `slotchange` event, `assignedElements()` and `assignedNodes()`; `slotAssignment: "manual"` assigns slots in script.
- Events: `Event.composed` and `composedPath()` govern whether events cross the shadow boundary.

## Forms and accessibility (important caveats)

- Native controls give validation, submission and accessibility for free; custom ones must rebuild them.
- Inputs inside a shadow root are not included in form submission by default, validation state is not exposed across the boundary, and IDs are local to the shadow root (which can break ARIA references such as `aria-labelledby`).
- **ElementInternals** helps: `static formAssociated = true`, `attachInternals()`, `setFormValue()`, custom states via `internals.states` (matched with `:state()`).
- You can set `role`, `aria-*` and `tabindex` on the host.
- The article's advice is clear: **prefer native light-DOM form controls when possible.** See forms-and-labels.md and accessibility.md.

## Styling

| Need | Technique |
|---|---|
| Style the element from outside | Light-DOM CSS applies to the custom element (not encapsulated) |
| Style inside | Shadow styles stay inside; outside styles do not leak in |
| Inherited properties (`color`, `font-family`) | They pass through the boundary; reset with `:host { all: initial; }` |
| Style the host | `:host`, `:host(selector)`, `:host-context(selector)` |
| Avoid flash of unstyled content | `:not(:defined)` hides JS-dependent elements until defined |
| Slotted content | Light DOM styles can target it; `::slotted()` from inside has low specificity |
| Let outsiders style internals | `::part(name)` on elements with a `part` attribute; `exportparts` passes parts through nesting; `::part()` cannot be used in complex selectors |
| Theming API | **CSS custom properties cross the shadow boundary,** the best way to expose themeable values |
| Stylesheets | `<link>` or `@import` inside the template, or `adoptedStyleSheets` with a constructed stylesheet shared across instances |
| Responsive components | Set `container-type` on `:host` and use container queries (see responsive-design.md) |

Universal selectors in the light DOM can override `:host` styles; `!important` is a blunt but practical protection.

## Patterns and tools

- **HTML web components:** custom elements that wrap and enhance real markup (a `<user-avatar>` containing an `<img>`, so the image exists before JavaScript). Also lite-youtube style embeds that start as a link and upgrade to an iframe.
- Libraries: **Lit** (small base class with reactive properties, templating, scoped styles; the article says it lacks an official SSR story), **webc** (11ty single-file components), **Enhance** (server-rendered web components), and design-system libraries (Adobe Spectrum, Microsoft FAST, Shoelace, now Web Awesome). Many of these behave like replaced elements that need JavaScript for meaningful content, a cost for small sites.
- Tiny reactive helpers (for example Reef, about 2.6KB) can pair with plain custom elements.

## Caveats and future work

- JavaScript-dependent content delays meaningful output.
- Shadow DOM complicates forms, ARIA and global styling.
- Standards are still evolving; the article lists proposals (declarative custom elements, cross-root ARIA, HTML modules, open styling, DOM Parts, scoped element registries). MDN already documents scoped registries and `:state()`. **[agent note]** Check browser support for any newer feature before depending on it.

## [agent note] When to reach for web components

My synthesis of the two sources:
- Good for framework-agnostic, shareable primitives (design-system building blocks) and for progressively enhancing real HTML.
- Keep the default HTML-first: use a native element if one exists; do not reimplement buttons, links or inputs.
- Avoid wrapping form controls in shadow DOM unless using ElementInternals; consider light DOM for anything form-related.
- Expose theming through CSS custom properties and `::part`, not by leaking global styles.
- Pair with component-systems.md (tokens, documentation) and accessibility.md.

## Agent checklist

- [ ] Native element considered first; custom element only when needed; name contains a dash.
- [ ] Meaningful HTML present before JavaScript runs (HTML-first); `:not(:defined)` handled.
- [ ] Listeners attached in `connectedCallback` and cleaned up in `disconnectedCallback`.
- [ ] Data passed via attributes treated as strings; no clashing attribute names; no extending built-ins.
- [ ] Forms: native light-DOM controls, or `formAssociated` with ElementInternals.
- [ ] ARIA references do not cross shadow roots; roles and `tabindex` set on the host where needed.
- [ ] Theming via custom properties and `::part`; templates cloned with `cloneNode(true)`.
- [ ] Browser support checked for newer APIs.
