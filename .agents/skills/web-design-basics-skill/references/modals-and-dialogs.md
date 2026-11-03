# Modal and nonmodal dialogs

Source: Nielsen Norman Group, "Modal & Nonmodal Dialogs: When (& When Not) to Use Them", https://www.nngroup.com/articles/modal-nonmodal-dialog/ . The article covers *when* to use dialogs; it says nothing about accessibility or implementation. Items marked **[agent note]** are mine.

## Definitions

- **Dialog:** a system-user "conversation" that asks for information or an action.
- **Mode:** a system state in which the same input gives different results (Caps Lock).
- **Modal dialog:** sits on top of the main content, puts the system in a special mode and disables the content behind it until the user responds.
- **Nonmodal (modeless) dialog:** leaves the content usable; the user can keep working, move, minimize or ignore it.
- Modals began as alerts for errors and critical states, but are now often used for persuasion, which is much less justified.

## Why modals cost users

1. They demand immediate attention; the task stops.
2. They interrupt the workflow, and users must rebuild context afterward.
3. They add cognitive load, so users forget task details.
4. They add an extra goal (read, understand, decide).
5. They block background content the dialog may depend on.

Default stance: **a modal is a last resort for noncritical activity.**

## Use a modal for

1. **Important warnings that prevent or correct critical errors.** Test: is it easier to fix in the content? (Form errors belong inline next to the field.) Is it irreversible (overwriting a file, losing unsaved work)? Reversible errors, such as a failed add-to-cart, rarely need an interruption.
2. **Information critical to continuing a user-initiated process.** Example: a logged-out user clicks "favorite" and is prompted to log in.
3. **Breaking a complex workflow into simpler steps** (wizards). Show progress; if many steps are needed, use a full page instead.
4. **A question that significantly reduces future effort**, when relevant to the current task (progressive profiling: one easy question at a time).

## Avoid a modal for

5. **Nonessential or unrelated content** (newsletter signups on arrival). Overuse erodes trust and trains users to ignore modals, so they miss important ones.
6. **High-stakes flows such as checkout**, where interruptions distract or pressure users (for example forcing account creation).
7. **Complex decisions that need information the modal hides** (an upsell that covers the seat map needed to decide).
- If an inline element would do the job (selecting a board, inviting friends), use it.

## Consider nonmodal instead

- Best for noncritical tasks: users can ignore it and continue.
- Still disruptive if it covers important content or needs complex input.
- **Check every breakpoint:** a nonmodal prompt that is easy to dismiss on desktop can turn into a full-screen blocker on mobile.
- Good for task switching: a compose window that stays open (and can be minimized) while the user searches elsewhere.

## [agent note] Implementation rules

Not from the article; standard platform practice consistent with accessibility.md (keyboard operability, no keyboard traps, visible focus) and interaction-patterns.md:
- Prefer the native `<dialog>` element (`showModal()` for modals) before building a custom one; it handles the top layer, inert background and Esc.
- On open, move focus into the dialog; on close, return focus to the element that opened it. Keep focus inside while a modal is open.
- Esc and a visible close button always dismiss non-destructive dialogs. Give the dialog an accessible name (`aria-labelledby`).
- Button labels name the action ("Delete project", "Keep editing"), not "OK"; follow component-usage-guidance.md. Put the safe option first or make the destructive one clearly distinct.
- Lock background scroll while a modal is open; make sure content inside scrolls on small screens and the dialog fits at 320px and 200% zoom.
- Do not auto-open a modal on page load or on a timer; do not open a second modal from a first.
- Preserve what the user entered if a dialog is dismissed accidentally.

## Agent checklist

- [ ] Could this be inline, a banner, or a nonmodal panel instead?
- [ ] Is the modal justified by a critical, irreversible, or required-to-continue case?
- [ ] No modal for marketing, signup nags, or unrelated content; none in checkout.
- [ ] Mobile behavior checked (a nonmodal must not become a full-screen blocker).
- [ ] Multi-step modal shows progress; long flows moved to a page.
- [ ] Native `<dialog>` or equivalent focus management, Esc, labelled, focus returned on close.
- [ ] Buttons are specific action verbs; destructive actions distinguishable.
