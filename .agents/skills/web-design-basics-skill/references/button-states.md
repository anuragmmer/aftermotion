# Button states

Source: UXPin, "Button States Explained" (Apr 2026), https://www.uxpin.com/studio/blog/button-states/

A button state is the visual feedback that tells a user what a control is doing right now: ready, being pressed, busy, or unavailable. Define every state for every button variant, and keep the definitions identical across the product.

## How many states to build

- Minimum set: default, hover, active, disabled.
- Add focus for anything keyboard-reachable (that is every button, so treat it as required).
- Add loading for buttons that trigger async work, and toggle for buttons that flip between two conditions.
- Mature design systems usually define 5 to 7 states per variant.

## The seven states

### 1. Default
The idle look on page load.
- Text contrast of at least 4.5:1 (WCAG AA).
- Label is an action phrase that names the outcome ("Submit order", not "Submit").
- Touch target at least 44x44px on mobile.

### 2. Hover
Pointer is over the button, not pressed. Signals "this is interactive".
- Use a subtle shift: slight color change, a shadow for elevation, or an underline on text buttons.
- Noticeable but calm. No dramatic animation.
- Touch devices have no hover, so never hide essential information or actions behind it.

### 3. Active (pressed)
The moment between press-down and release. Confirms the system registered the input.
- Darken the color, add an inset shadow, or scale down slightly.
- Brief and immediate so it feels snappy.
- Must reverse cleanly on release.

### 4. Focus
Keyboard focus, normally an outline ring. Persists until focus moves elsewhere (active is momentary, focus is not).
- Never remove the focus indicator without replacing it. It is a WCAG requirement.
- If the browser default clashes with the design, swap in a custom ring (for example a 2px ring with an offset in the brand color).
- Focus ring needs at least 3:1 contrast against its background.

### 5. Disabled
Visible but unavailable.
- Mute it with lower opacity or a desaturated palette.
- Expose it to assistive tech with `aria-disabled="true"`.
- Where possible tell the user why ("Complete all required fields to continue") via a tooltip or nearby text. Prefer visible helper text: tooltips on disabled controls are often unreachable by keyboard and touch.
- Do not pre-disable a form's submit button; let users submit to see validation (see forms-and-labels.md). Use a disabled button where the action is genuinely unavailable. GOV.UK goes further: avoid disabled buttons unless research shows they help, since poor contrast confuses users (see component-usage-guidance.md).

### 6. Loading
The action was triggered and is processing.
- Prefer a spinner beside the original label (Vercel advises keeping the label; see interaction-patterns.md). Swapping the label for a spinner is acceptable only for compact buttons.
- Delay showing the spinner about 150 to 300ms and keep it visible about 300 to 500ms once shown, to avoid flicker.
- Disable the button while loading to block duplicate submissions.
- For long operations, show progress if it is known.

### 7. Toggle
A button that switches between two conditions (on/off, bookmarked/not, selected/unselected).
- The two conditions must be clearly distinguishable: color, icon swap, or filled vs outlined.
- Expose the state with `aria-pressed="true|false"`.
- A short animation on the transition reinforces the change.

## Applying states across variants

| Variant | State treatment |
|---|---|
| Primary | Bold, high contrast. States are most prominent here. |
| Secondary | Same patterns, reduced emphasis. |
| Tertiary (text or outline) | Subtle: underline on hover, slight color shift on press. |
| Icon button | Background fill or ring effects rather than recoloring the icon itself. |
| Ghost (transparent) | Add a background fill or border to express hover, press and focus. |

## Accessibility rules for states

1. Color alone is never enough. Pair every color change with a second cue (shape, text, icon, size, underline).
2. Every interactive element has a visible focus state.
3. Use ARIA correctly: `aria-disabled`, `aria-pressed`, `aria-label` where the visible label is missing. Prefer a native `<button>` over `role="button"` on a div.
4. All states must be reachable and operable by keyboard (Enter and Space activate a button).
5. Text contrast of 4.5:1 must hold in every state, not just default. Check hover, active and disabled text too.
6. Test with keyboard-only navigation.

## Platform notes

- **Web desktop**: full state range. Implement with `:hover`, `:active`, `:focus-visible`, `:disabled` (see css-patterns when that reference exists). Wrap hover styles so they only apply on devices that can hover (see defensive-css.md, "Accidental hover on touch devices").
- **Mobile (iOS, Android)**: no hover; the flow goes straight from default to pressed. Focus still matters for screen readers (VoiceOver, TalkBack). Follow Material Design 3 or Apple HIG for platform-native state behavior.
- **TV and console**: remote or controller navigation makes focus the primary signal. Focus indicators must be large, high contrast and impossible to miss at viewing distance.

## Design-system guidance

Define states once, centrally, and reuse. Benefits: consistency across products, no re-deriving state logic per project, and what is reviewed in a prototype matches what ships.

## Checklist for the agent

- [ ] Every button variant has default, hover, active, focus, disabled styled.
- [ ] Loading and toggle states exist where the behavior needs them.
- [ ] Focus ring visible, 3:1 contrast, not removed.
- [ ] 4.5:1 text contrast in all states.
- [ ] State is conveyed by more than color.
- [ ] Touch target at least 44x44px.
- [ ] Disabled buttons explain why.
- [ ] Loading disables the button to prevent double submit.
- [ ] Hover is not the only place any information lives.
