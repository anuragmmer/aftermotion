# Accessibility

Sources:
- W3C WAI, "Designing for Web Accessibility: Tips for Getting Started", https://www.w3.org/WAI/tips/designing/ (10 tips, each mapped to WCAG success criteria)
- WCAG.com, "Accessibility guidance for designers", https://www.wcag.com/designers/ (section 12 below)
- Material Design 1, "Accessibility", https://m1.material.io/usability/accessibility.html (stand-in: the M2 page at m2.material.io is script-rendered and could not be read. M1 is no longer maintained; numbers below match WCAG so they are safe, but Android-specific advice is marked.)

Items marked **[agent addition]** are my translation or extension and are not stated by these sources.

## 1. Contrast

- Text must contrast sufficiently with its background, including text over images, gradients and inside buttons. WCAG 1.4.3.
- Numbers (Material, consistent with WCAG AA): **4.5:1** for normal text, **3:1** for large text (18pt regular or 14pt bold and up). Icons and other critical elements meet the same ratios.
- Exceptions: logos and incidental text (words in a photo), and purely decorative elements. Do not distort a logo to pass contrast. Decorative items that have a function must still be distinguishable.
- Some users need darker, low-luminance palettes because bright colors are hard to read, so support dark themes properly (check contrast in both).
- Contrast must hold in every interactive state (see button-states.md).

## 2. Do not rely on color alone

WCAG 1.4.1. Add a second cue that is not color: asterisk on required fields, labels on chart areas, icons, strokes, patterns, text. Material's example: an error state uses a colored title, a stroke and an error message together. Also never refer to things only by color in copy ("click the green one").

## 3. Interactive elements must be identifiable

WCAG 2.4.7 (Focus Visible), 3.2.4 (Consistent Identification).
- Links and buttons have distinct styling and visibly change on hover, keyboard focus and press or touch.
- Style and name the same control the same way everywhere.
- Every interactive element is reachable by keyboard, and the focused element is always visible (a moving border or highlight as Tab advances).
- Focus order follows the visual layout, top to bottom, most to least important. After an interruption, return focus to the element that had it.

## 4. Navigation

WCAG 3.2.3, 2.4.5.
- Keep navigation labels, styling and position consistent across pages.
- Offer more than one way to find content (search, site map).
- Orient users with breadcrumbs and clear headings.

## 5. Forms

WCAG 3.3.2, 2.4.6.
- Every field has a visible, descriptive label placed close to it.
- Left-to-right languages: label to the left of or above the field; for checkboxes and radio buttons, label to the right.
- Do not leave a large gap between label and field.
- **[agent addition]** Use a real `<label for>` association, not placeholder text as the label.

## 6. Feedback

WCAG 3.3.1 (Error Identification), 3.3.2, 3.3.3 (Error Suggestion).
- Confirm interactions: submission success, error alerts, page-change notices.
- Make instructions easy to find. Present feedback that needs action prominently.
- Good error summary: lists each problem, uses an icon plus background color (not color alone), marks the offending fields (for example red plus asterisk), and suggests a fix.
- Confirm destructive or hard-to-undo actions (dialog, toast or snackbar). If the confirmation is only visual, supply an accessible text equivalent too.

## 7. Structure, grouping and hierarchy

WCAG 2.4.6, 2.4.10.
- Use whitespace and proximity to show which things belong together; use headings to group and make pages scannable. Avoid long text blocks with few headings.
- Order by importance; put key actions where they are easy to reach; group similar items under a descriptive heading.
- Keep related things physically close (a slider and its value), so users who magnify the screen do not have to pan.

## 8. Viewport and text scaling

- Design for phones, narrow windows and zoomed or large-text settings, not just desktop. Reposition header and navigation to use space well; manage text size and line length for readability. Example: multi-column with visible navigation when wide; single column with navigation behind icons when narrow or zoomed.
- Allow room for enlarged text and for other languages' fonts, which can need different line heights. Use a spacious layout so scaled text neither overlaps nor clips.
- **Android (native):** size text in `sp` so system font settings apply.
- **[agent addition] Web:** size type in `rem` (not fixed `px`), avoid fixed heights on text containers (see defensive-css.md), and test at 200% zoom.

## 9. Touch targets

- At least **48x48** (about 9mm; recommended 7 to 10mm), with **8 or more** between targets. The visible element can be smaller than its target (24 icon in a 48 target; 36-high button in a 48 target). Larger can help for children. This is consistent with spacing-grids-layout.md (never below 44x44).

## 10. Alternatives for non-text content

WCAG 1.1.1. Plan visual space for the alternatives, do not bolt them on later:
- Visible links to audio transcripts and to audio-described video.
- Text labels next to icons and graphical buttons.
- Captions and descriptions for tables and complex charts.
- Work with content authors and developers so alternatives actually get supplied.

### Labels for screen readers (Material, written for Android but principles are general)
- Unlabeled controls (icon buttons, icon-only tabs) need a text name. **[agent addition] Web equivalent:** `aria-label` or visually-hidden text; `alt` on images.
- Keep labels short; screen reader users hear every element.
- Do not put the control type or state in the label ("Search", not "Search field"); the role already says it.
- Describe the action, not the appearance; never "click here". Use the same label for the same element everywhere.
- Toggle for a property: let the checkbox state announce on/off. For an action, label the action and swap it ("Add to wishlist" / "Remove from wishlist").
- Do not mention physical gestures like "tap" in labels; users may use keyboard, switch or braille display.
- Use hint text sparingly, only for complex UI.

## 11. Motion, timing and auto-start content

WCAG 1.4.2 (Audio Control), 2.2.2 (Pause, Stop, Hide).
- Provide visible controls to stop or pause auto-playing animation, carousels, sliders, background sound and video (a carousel with play/stop and slide selection).
- Content that moves, scrolls or blinks automatically for **more than 5 seconds** must be pausable, stoppable or hideable.
- Flash no more than **3 times per second**; avoid flashing across large central areas.
- Do not put important controls on timers; if a control times out it must be re-enableable or reachable another way.
- Avoid autoplaying background audio; provide captions or transcripts for critical audio.
- Respect `prefers-reduced-motion` with a reduced variant (also recommended by Vercel; see motion-and-performance.md).

## 12. Additional WCAG criteria for designers (wcag.com)

Levels in brackets. Beyond the six items the site highlights (contrast, link text, headings and labels, alt text, tab order, error correction), these matter for design work:

**Perceivable**
- **1.4.11 Non-text Contrast (AA):** UI components, their states and meaningful graphics need at least **3:1**. This is what backs the 3:1 focus-ring and control-border rule in button-states.md.
- **1.4.3 Contrast (AA):** text and images of text.
- **1.4.4 Resize Text (AA):** text scales to 200% with no loss of content or function.
- **1.4.10 Reflow (AA):** no loss of content or function at **320px width**; avoid horizontal scrolling unless the content cannot reflow (data tables, maps).
- **1.4.12 Text Spacing (AA):** user changes to line, word or letter spacing must not break the layout (another reason for `min-height` over `height`; see defensive-css.md).
- **1.4.5 Images of Text (AA):** avoid unless essential (logos).
- **1.3.1 Info and Relationships (A):** visual structure matches the underlying structure that a screen reader presents.
- **1.3.3 Sensory Characteristics (A):** instructions must not rely only on shape, size, position, orientation or sound ("the button on the right").
- **1.3.4 Orientation (AA):** do not lock to one orientation unless essential.
- **1.4.1 Use of Color (A)** and **1.4.2 Audio Control (A):** auto-playing audio longer than **3 seconds** needs pause or stop.

**Operable**
- **2.1.2 No Keyboard Trap (A):** keyboard users can move into and out of every component (modals and widgets especially).
- **2.2.1 Timing Adjustable (A):** time limits must not cause unexpected changes.
- **2.2.2** and **2.3.1:** see section 11 (5 seconds; 3 flashes).
- **2.4.4 Link Purpose (A):** link text states where it goes; visually distinct, concise and unique; never "click here"; do not include the word "link" (screen readers announce it).
- **2.4.5 Multiple Ways (AA)**, **2.4.3 Focus Order (A)**.
- **2.4.13 Focus Appearance (AAA):** clearly visible focus indicators.

**Understandable**
- **3.2.1 On Focus (A):** receiving focus must not trigger an automatic change of context.
- **3.2.3 Consistent Navigation (AA)** and **3.2.6 Consistent Help (A):** same placement and order everywhere.
- **3.3.3 Error Suggestion (AA)**; **3.3.4 Error Prevention for legal, financial or data actions (AA):** let users review, correct or confirm before final submission.

**Headings and alt text (design-relevant details)**
- Headings follow a nested, logical structure that mirrors the visual one.
- Decorative images are marked so screen readers skip them; informative images get concise alt text describing meaning.

## Agent checklist

- [ ] Text 4.5:1 (large text 3:1); icons and critical UI also meet it; checked in all states and themes.
- [ ] No information conveyed by color alone.
- [ ] Visible focus on every interactive element; logical focus order; fully keyboard operable.
- [ ] Consistent naming and styling of controls and navigation; more than one way to find content.
- [ ] Every form field has an associated visible label; errors identify the field, say what is wrong and suggest a fix.
- [ ] Destructive actions confirmed.
- [ ] Headings and spacing group related content; related controls sit close together.
- [ ] Layout works narrow, zoomed and with large text; no clipping.
- [ ] Touch targets 48x48 (min 44x44) with 8 spacing.
- [ ] Icon-only controls have text names; images have alternatives; media has captions or transcripts.
- [ ] Auto-playing motion or audio can be paused; no more than 3 flashes per second.
- [ ] UI component borders, states and focus rings at least 3:1.
- [ ] Works at 320px width and 200% text zoom without horizontal scroll or clipping; survives user text-spacing changes.
- [ ] Links have descriptive, unique text; no "click here"; no keyboard traps; no change of context on focus.
- [ ] Instructions do not rely on shape, position or color alone.

## Overlaps with earlier references

Contrast (4.5:1), focus visibility, "color is not enough" and touch size repeat points in button-states.md; this file is the canonical statement of them. The 3:1 focus-ring contrast from UXPin is supported by WCAG 1.4.11 (section 12). Form labels are detailed further in forms-and-labels.md; site structure and heading order in information-architecture.md.
