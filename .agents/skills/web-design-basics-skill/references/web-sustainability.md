# Web sustainability guidelines

Source: W3C Sustainable Web Design Community Group, "Web Sustainability Guidelines (WSG) 1.0", https://www.w3.org/TR/web-sustainability-guidelines/ . I read the whole document except per-guideline "Additional information" and tag lists, which the fetch omitted, and one cut-off criterion in 5.8. The guidelines are goal statements with testable success criteria; I list the guidelines and the main criteria. Items marked **[agent note]** are mine.

**Scope for this skill:** SEO, testing and QA are out of scope, so the WSG's SEO and audit items (2.6 "ethical SEO", 2.15, 2.16, 3.8 structured data and meta tags for discovery, 3.13 sitemap/robots) are noted but not expanded. Section 5 (business strategy) is organizational; included in brief.

**Priority rule from the WSG:** legal requirements first; never trade away accessibility, privacy or security for sustainability.

## How the guidelines connect to the rest of this skill

Most of this is "less is more": fewer bytes, fewer requests, less code, fewer distractions. Where existing references already cover it, follow them: images and fonts and animation (motion-and-performance.md), reduced motion and preferences (accessibility.md, responsive-design.md), design systems (component-systems.md), dependencies (architecture-and-planning.md).

## 2. User experience design

- **Assess impact early and at intervals** (2.1); understand audience needs and constraints (2.2); bring sustainability into ideation, wireframes and prototypes (2.3).
- **Efficient user journeys** (2.4): shortest path to the goal; patterns that reduce effort; good sitemaps, navigation and search.
- **Assist, do not distract** (2.5): respect attention; remove engagement traps such as infinite scroll.
- **No manipulation or deception** (2.6): no deceptive patterns; label advertisements; no unnecessary tracking; respect consent.
- **Reusable, understandable deliverables** (2.7); **use a design system** for large or multi-contributor projects and load only the components used (2.8).
- **Optimize media** (2.9): question whether media is needed; optimize; lazy load; let the user control playback (no autoplay); keep a media management policy.
- **Proportionate animation** (2.10): needed, not overburdening, user-controllable, efficient.
- **Optimized web typography** (2.11): prefer pre-installed typefaces; optimize and subset web fonts.
- **Avoid unwanted notifications** (2.12): only when needed; opt-in by default, with settings.
- **Reduce document impact** (2.13): optimize documents, offer clear format choice, reduce printing.
- **Involve users early** (2.14); validate with real users (2.16); **cross-platform compatibility** without planned obsolescence (2.17).

## 3. Web development

- **Set performance and energy goals** with resource limits (3.1).
- **Minify and remove unused/dead code** (3.2); **code-split heavy components, without over-splitting** (3.3); **avoid duplication**, iterate on existing solutions (3.4).
- **Treat third parties as first parties** (3.5): assess and reduce them, load on interaction, self-host where practical, honor user opt-outs.
- **Semantics** (3.6): valid markup, standard elements over custom ones, no non-standard tech.
- **Defer non-critical resources** (3.7): async loading, resource and priority hints.
- **Media queries for user preferences** (3.9): color scheme, contrast, motion, reduced data.
- **Layouts work across devices** (3.10): progressive enhancement; support alternative browsing methods.
- **Efficient JavaScript and APIs** (3.11): limit requests and payload sizes.
- **Use dependencies sparingly** (3.12): review and remove regularly, limit libraries, keep them updated.
- **Most efficient solution** (3.14): static over dynamic where possible, review plugins, lightweight interface components.
- **Latest stable language versions** (3.15); **reduce database queries** (3.16): efficient queries, reuse retrieved data, minimize data, apply lifecycle rules such as TTL.

## 4. Hosting, infrastructure and systems

- **Sustainable hosting** (4.1): choose providers that disclose metrics (PUE, WUE, CUE, renewable share); low-carbon electricity.
- **Caching and offline access** (4.2): client and server caching with proper invalidation; **content behind authorization must not persist after logout.**
- **Compression** (4.3): server-side compression for suitable types; compress media before upload.
- **Error pages and redirects** (4.4): friendly error pages that expose no sensitive detail; fix broken links; few, tested redirects.
- **Avoid unnecessary virtualized environments** (4.5); **automate recurring tasks wisely** and right-size capacity with autoscaling, buffering, throttling (4.6); restrict abusive bots while keeping content open to legitimate users and crawlers.
- **Set data refresh frequency** from user need and accuracy (4.7); **routine, secure, incremental backups** with limited access (4.8).
- **Data processing** (4.9): modern secure protocols (HTTPS, HTTP/2 or 3; avoid HTTP and FTP); avoid unnecessary processing; process data close to its source; consider carbon-aware scheduling and event-driven designs where they are more efficient.
- **CDNs only when they help** (4.10): static content, global audiences; local audiences prefer nearby hosting; never put dynamic or fast-changing resources on a CDN.
- **Right-size infrastructure** (4.11); **store data per user needs** (4.12): delete obsolete data, set retention, rotate and expire logs, make large long-lived assets downloadable.

## 5. Business strategy and product management (brief)

Publish and version ethics, accessibility and sustainability policies (5.1); assign a sustainability advocate (5.2); train the team (5.3); tell users the impact of their choices (5.4); calculate life-cycle impact including third-party tooling (5.5); set measurable goals (5.6); get external verification of claims (5.7); publish at least annual impact reports (5.8). The conformance section warns against greenwashing: a claim must name the date, guideline and criteria met.

## [agent note] Rules to apply when building

- Budget the page: set a weight/request target up front and check against it.
- Ship less: no autoplay media, no infinite scroll by default, no unneeded third-party scripts, fonts or libraries; lazy-load below-the-fold media.
- Respect `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast` and reduced-data signals.
- Static or cached before dynamic; compress; cache with invalidation; never cache private content past logout.
- Do not make sustainability claims you cannot back with measurements.

## Agent checklist

- [ ] Performance/size goals set and checked; unused code and dependencies removed.
- [ ] Third-party scripts justified, deferred, and honoring consent.
- [ ] Media optimized, lazy-loaded, never autoplaying; animation proportionate with reduced-motion support.
- [ ] Fonts: system fonts first, otherwise subset and optimized.
- [ ] User-preference media queries supported.
- [ ] Caching, compression, modern protocols, friendly error pages in place; no private content cached after logout.
- [ ] No deceptive patterns, engagement traps, or unnecessary notifications or tracking.
- [ ] Accessibility, privacy and security not traded away for sustainability.
