# Forms and labels

Source: Webability, "HTML label tag", https://www.webability.io/blog/html-label-tag. The article's statistics (completion-rate gains, failure rates, lawsuit shares) were unsourced in the fetched content and are intentionally left out. Items marked **[agent note]** are my commentary.

Also read accessibility.md section 5 (forms) and section 6 (feedback). This file is the detailed rule set for labels. Per-component rules (text input, radios, checkboxes, select, date, password, file upload) and error-message wording are in component-usage-guidance.md.

## What a label does

- Connects descriptive text to a form control (text field, checkbox, radio, select, textarea).
- Screen readers announce it when the control is reached, giving the field its accessible name.
- Enlarges the click or tap target: activating the label text activates the control. This helps motor-impaired and mobile users.
- Maps to WCAG 3.3.2 (Labels or Instructions, Level A).

## Two ways to associate

**Explicit (preferred):** match `for` to the input's `id`.
```html
<label for="name">Name</label>
<input id="name">
```
Works wherever the label and input sit in the document, so it suits complex or responsive layouts.

**Implicit (wrapping):** nest the control inside the label.
```html
<label>Sign up for our newsletter <input type="checkbox"></label>
```
Valid HTML but can fail with some assistive technologies. Reserve for simple, self-contained inputs where label and control are adjacent.

Rule of thumb from the source: always prefer the explicit method.

## Best practices

- One label for every standard field, including textareas and selects.
- Labels are visible and persistent, not something users must remember.
- Label text needs 4.5:1 contrast.
- **Hiding a label visually:** use a screen-reader-only (visually-hidden) CSS class. Never `display: none` or `visibility: hidden`; those also remove it from assistive technology.
- `aria-label`: only when no visible label is practical (for example an icon-only search button).
- `aria-labelledby`: when an existing on-screen element should act as the label.
- Native HTML first; use ARIA only when native elements cannot do the job.
- Placement (from W3C, accessibility.md): above or to the left of the field in left-to-right languages; to the right for checkboxes and radios; keep the gap small.

## Common mistakes

1. **Placeholder instead of a label.** Placeholder text vanishes on typing, is often low contrast, and is not reliably announced. Use it at most for a format hint, in addition to a label.
2. Hiding the label with `display: none` or `visibility: hidden`.
3. `for` and `id` that do not match, leaving no accessible name.
4. ARIA where a native `<label>` would do.
5. Relying on implicit wrapping where compatibility matters.

## Testing

Inspect the control in browser dev tools and open the Accessibility pane. The computed accessible name should equal the label text; a missing or wrong name means the association is broken. **[agent note]** Also click the label text and confirm the control activates.

## Form behavior (Vercel, "Web Interface Guidelines", https://vercel.com/design/guidelines)

- **Submitting:** Enter submits when a single text input is focused; with several controls, Enter applies on the last one. In a textarea, Cmd/Ctrl+Enter submits and Enter adds a newline.
- **Labels:** every control has an associated `<label>`, and clicking it focuses the control. Checkbox and radio label plus control share one generous hit target.
- **Submit button:** keep it enabled until submission begins; then disable it, show a spinner and send an idempotency key. **Do not pre-disable submit on an incomplete form;** let users submit to see validation. **[agent note]** This conflicts with the "disabled with a reason" pattern in button-states.md. Resolution: for forms with validation, leave submit enabled and show errors; reserve a disabled submit for cases where the action is genuinely unavailable (and explain why in visible text).
- **Input freedom:** never block keystrokes. Accept the input and show validation feedback.
- **Errors:** show next to their fields; on submit, move focus to the first error.
- **Autofill and types:** set `autocomplete` and meaningful `name`; correct `type` and `inputmode`; disable spellcheck for emails, codes and usernames.
- **Placeholders:** an example value or pattern, ending with an ellipsis (`+1 (123) 456-7890…`). Never a substitute for a label.
- **Unsaved changes:** warn before navigating away when data could be lost.
- **Password managers and OTP:** stay compatible; allow pasting one-time codes. Avoid triggering password managers on non-auth fields (for example search): `autocomplete="off"`, or `autocomplete="one-time-code"` for OTP fields.
- **Trimming:** trim trailing whitespace added by text-expansion tools so users do not see false errors.
- **Windows selects:** set `background-color` and `color` explicitly on `<select>` to avoid dark-mode contrast bugs.

## Agent checklist

- [ ] Every control has a `<label for>` that matches a unique `id`.
- [ ] No placeholder-only fields.
- [ ] Visually hidden labels use an sr-only class.
- [ ] Icon-only controls have `aria-label`.
- [ ] Label contrast at least 4.5:1; placement consistent across the form.
- [ ] Clicking the label focuses or toggles the control.
- [ ] Submit not pre-disabled; errors shown beside fields and focus moved to the first error.
- [ ] `autocomplete`, `type` and `inputmode` set; paste never blocked; unsaved-change warning where data could be lost.
