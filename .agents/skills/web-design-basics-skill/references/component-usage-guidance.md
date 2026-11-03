# Component usage guidance

Source: GOV.UK Design System component pages, https://design-system.service.gov.uk/components/ (index of 37 components). I read 28 general-purpose component pages; UK-government-specific chrome was skipped (cookie banner, exit this page, phase banner, feedback, GOV.UK header and footer, generic header, language navigation, service navigation).

The system is evidence-led and built for public services, so many rules are cautious ("avoid X unless research shows it helps"). Items marked **[agent note]** are my commentary or my reconciliation with other references. Component-specific CSS class names and framework version notes are left out.

## Cross-cutting principles

- **Test without the component first.** Several pages (tabs, accordion, character count) say to try simplifying content, splitting pages, adding headings or a contents list before reaching for the component.
- **Do not hide what most users need.** Disclosure components (accordion, tabs, details) are for content only some users want.
- **One thing per page** where possible: when a page asks a single question, the label or fieldset legend can be the page heading, so screen readers announce it once. On multi-question pages, do not.
- **Hints:** one short sentence, no trailing full stop, **no links** (screen readers read the link text but may not say it is a link). Link hints and errors to their input with `aria-describedby`.
- **Never pre-select** answers to questions (radios, checkboxes, selects); pre-select only for settings.
- **Do not block copy and paste;** do not limit with `maxlength` (silent truncation); state limits and validate.
- **Sentence case** for labels and buttons in this system. **[agent note]** Vercel's house style (visual-polish-and-copy.md) uses Title Case. Follow the project's existing convention; if none, sentence case is the common default for UI labels.

## Actions

**Button**
- Use for the main action; one default (primary) button per page; secondary buttons for secondary actions and not many of them (simplify or split content instead).
- Warning (destructive) buttons very sparingly, with a confirmation step; never rely on red alone.
- Avoid disabled buttons unless research shows they help (poor contrast confuses). **[agent note]** consistent with forms-and-labels.md: do not pre-disable submit.
- Labels: sentence case, describe the action ("Save and continue"); "Continue" when nothing is saved. Align the primary button to the left edge of the form.
- A link styled as a button (not `<button>`) for a start action that does not submit data.
- Double-click prevention only where users frequently double-submit; also protect server-side; show feedback (spinner) on slow connections.
- Inverse (dark-background) buttons need 4.5:1 contrast.

## Form inputs

**Text input:** single-line text. Visible label above the field, short, sentence case, no colon. Do not use placeholder as label, hint or example. Fixed widths for predictable content (postcodes), fluid otherwise. Whole numbers: `inputmode="numeric"`; decimals: `inputmode="decimal"` (not when negatives are possible); avoid `type="number"` unless research shows a need. Visually separate characters in long codes. Prefixes and suffixes (currency, units) sit outside the input and are not the only place the unit is stated; accept entries that include them. Set `autocomplete` with a valid purpose (WCAG 1.3.5); turn spellcheck off for references, names, emails. Default placeholder styling often fails contrast.

**Textarea:** for longer text; label above; height via `rows` proportional to expected text; use a character count to limit. Not for open-ended questions that could be split into simpler ones or options. Specific error wording: empty "Enter [x]"; too long "[x] must be N characters or less"; too short "[x] must be N characters or more".

**Character count:** only with a real reason (evidence users write too much, or a legal/technical limit); test without it first; if users hit a backend limit, raise it. Does not block input (users can exceed then edit down); count below the field; optional threshold so it appears only near the limit; set limits above what most users need; red border only when over the limit; consider word counts for long answers.

**Select:** a last resort in public services and only for long lists; first ask narrowing questions, use radios for a few options, checkboxes for multiple. Users often struggle to close it, type into it, tell focus from selection, or notice it scrolls. No multiple-select.

**Radios (single choice):** radios left of labels; sort alphabetically by default (ordering by popularity can reinforce bias); no default selection; include "None of the above" or "I do not know" where valid (users cannot unselect without refreshing); group in a fieldset with a legend; "Select one option" hint if unclear; inline only for two short options; "or" divider for an odd-one-out option; small radios only for dense repeat-use screens.

**Checkboxes (multiple choice or a single on/off):** left of labels; "Select all that apply" hint; no defaults; fieldset with legend; "None" option last, after an "or" divider, with exclusive behavior (selecting it clears others) and an error if both are chosen without JavaScript.

**Conditional reveals (radios and checkboxes):** reveal only a simple, related question; complex or multi-part follow-ups go to the next page; never reveal non-question content; screen readers are not always told content appeared (WCAG 4.1.2), so keep it simple.

**Date input:** three fields (day, month, year) in a fieldset with a legend, for dates users know or can easily look up (a date picker suits dates people cannot recall). Hint with a valid example; widths 2, 2, 4 characters; accept full or abbreviated month names. Never auto-advance between fields. Birthday autocomplete tokens `bday-day`, `bday-month`, `bday-year`. Error priority: missing information, then impossible dates, then other validation; highlight the whole date for empty or wrong time frame, the specific field for incomplete or impossible values.

**File upload:** only ask if critical; let users reuse a previously uploaded file in a journey; visible label tied with `for`/`id`; state permitted types and size limits; specific error per case (none selected, wrong type, too big, empty, virus, password protected, upload failed, too many).

**Password input:** hidden by default with a "Show" toggle (differently labelled if two fields); skip the "confirm password" field since the toggle lets users check; `autocomplete="new-password"` when creating, `current-password` otherwise; always allow paste; no `maxlength`; spellcheck and auto-capitalization off; same character support and rules everywhere. After a failed login do not reveal whether username or password was wrong, and clear the password field. Not for MFA codes or security answers (use a text input).

**Fieldset:** groups related inputs (address); the first child is a `legend` (a question or statement); radios, checkboxes and date input already include one.

## Errors

**Error message:** show next to the field and in the error summary. Say what is wrong and how to fix it, in plain positive language that reuses the field's label wording. Avoid jargon, blame, "please", "sorry", "valid/invalid", and generic text ("An error occurred", "This field is required"). Use instruction style for empty fields ("Enter your first name") and description style for wrong or out-of-range entries ("Name must be 35 characters or less"). Same text beside the field and in the summary. Red text after the label and hint, plus a red border on the field. Keep the user's entries; never clear fields. Hidden "Error:" prefix for screen readers. Do not use for problems the user cannot fix (eligibility, capacity): send them to a page that explains what to do next.

**Error summary:** always show on validation failure, even for one error. At the top of the main content (below breadcrumbs or back link, above the `h1`). Heading "There is a problem". Move keyboard focus to it. Each message links to its field (first option for radios and checkboxes; first erroring field for multi-field answers). Prefix the page `<title>` with "Error:". Do not show a notification banner and an error summary on the same page.

## Disclosure

Choosing between them: **tabs** for quick switching between many labelled sections, **accordion** for stacked sections, **details** for one or two short, less important pieces.

**Tabs:** use when content splits into clear sections, the first matters most, and users do not need all at once. Not for large content, ordered steps, comparisons across tabs, or page navigation. Put the most-needed tab first; clear labels that do not wrap; do not disable tabs (remove them or explain empty content); repeat the label as a heading in each panel. Without JavaScript and on small screens, show all sections in order with a contents list. Selected tab goes in the URL fragment so Back works.

**Accordion:** overview of related sections or show/hide of relevant ones, for regular users doing familiar tasks, and only with evidence the benefit outweighs the risk of hiding content. Not for content everyone needs, splitting a series of questions, nesting or combining with tabs or details, or very large content. Whole heading is the button; sentence-case, short, descriptive; summary line only if essential; section headings `h2` (adjust to the page); sections start hidden unless there is a reason; remember open state in-session; do not disable sections. Without JavaScript show everything. Long button text hurts screen-reader navigation.

**Details:** one short, less important block that only some users need; short descriptive summary link ("Help with nationality"). Not for information most users need.

## Navigation

**Breadcrumbs:** multi-level sites only; start at home and end at the **parent** of the current page (this system does not include the current page); not for flat sites, linear journeys, or where other navigation already suffices. Place before `<main>` inside a `nav` with `aria-label`; optionally collapse to first and last items on mobile.

**Back link:** at the top of the page before `<main>`, linking to the previous page in the state the user last saw; "Back" for simple journeys, descriptive text for complex ones; never combine with breadcrumbs; works without JavaScript where possible.

**Pagination:** only to improve performance or usability, when most users need just the first pages. **Avoid infinite scroll** (keyboard problems). Not for linear journeys (use Continue and Back). Place after the content; hide when there is one page; redirect nonexistent pages to the first; drop previous on page one and next on the last; filters or sorting apply to the whole list and return to page one. Small screens: current, previous, next, first and last; large screens add pages either side; use "…" for skipped pages. Show the page number in the `<title>` ("Search results (page 1 of 4)"), `aria-current="page"` on the current link.

**Skip link:** the first focusable element after `<body>`; hidden until a keyboard user focuses it; targets the main content and moves focus there; do not wrap it in `<nav>` or the header.

## Feedback and emphasis

**Notification banner:** for information not central to the page task (service-wide problem, a deadline, confirmation of a previous-page action). Use sparingly (people miss banners); not for validation errors; one banner at most (combine or prioritize). Place immediately before the `h1`. Neutral banner headed "Important"; success banner headed "Success" with `role="alert"`, removed on the next page. Text headings so meaning is not color alone.

**Warning text:** for important, consequential warnings (legal consequences); specific wording; hidden "Warning" text for screen readers; not for routine information.

**Inset text:** sets apart quotes, examples or extra information; use sparingly; not for very important or legal information (users can miss it).

**Panel:** confirmation pages (brief high-level summary) and interruption pages; not for highlighting anything else.

**Tag:** shows status when an item can have more than one (fewest statuses that work). Never interactive; use adjectives ("Completed"), not verbs; sentence case; consistent color per status; color alone is not enough.

## Data display

**Table:** compare data in rows and columns; never for page layout. A `<caption>`; header cells with `scope="col"/"row"`; right-align numeric columns; split large tables across pages where possible, shrink text on small screens only for large tables. (No sortable-table guidance on that page.)

**Summary list:** key facts or a user's answers (check-your-answers). Not for tabular data or plain lists. Each row has a key and at least one value; a "Change" action per row with visually hidden context ("Change name"); for missing values link to the relevant question; summary cards for several lists of the same type with 2 to 3 short card actions, confirming hard-to-undo ones; pre-populate returning users' data; keep row borders (help zoomed users).

**Task list:** long, complex services where users may not finish in one sitting or need to choose task order, and only with evidence of need. Tasks completable in any order; status per task (not started, completed); whole row is the link; short sentence-case names; group large sets under headings; not for fixed-order services or showing answers (use a summary list).

## Not covered here
Cookie banner, exit this page, phase banner, feedback, GOV.UK header and footer, generic header, language navigation, service navigation (site-specific chrome).

## Agent checklist

- [ ] Right component chosen from "when to use / not to use" before building a bespoke one.
- [ ] One primary button per page; labels describe the action.
- [ ] Single-choice vs multiple-choice vs select vs text chosen deliberately; nothing pre-selected.
- [ ] Hints short, link-free, tied with `aria-describedby`; labels visible, above the field.
- [ ] Errors specific, same wording inline and in a summary at the top, focus moved, entries preserved.
- [ ] Disclosure components not hiding what most users need.
- [ ] Breadcrumbs and back link not combined; pagination (not infinite scroll) where lists are long.
- [ ] Tags non-interactive; banners rare; one banner at most.
- [ ] Tables have captions and header scopes; numbers right-aligned.
