# Information architecture (website structure)

Source: UXPin, "Web structures explained", https://www.uxpin.com/studio/blog/web-structures-explained/ (product promotion removed). Items marked **[agent note]** are my commentary, not the source's.

Website structure is how pages, content and navigation are organized and linked. It decides how people find things and how search engines crawl them. Goals: findability, crawlability, scalability, and a clear statement of what the site is for.

## The four structure types

### 1. Hierarchical (tree)
Parent to child: homepage, categories, subcategories, detail pages. Every page has one clear place.
- Best for: corporate sites, e-commerce, docs portals, SaaS marketing sites, news.
- Strength: clear taxonomy; supports breadcrumbs and intuitive menus.
- Risk: deep nesting buries content and wastes crawl budget; sections silo without cross-links.
- Tips: keep depth to 3 or 4 levels; use breadcrumbs; cross-link related pages at the same level.
- Examples: Amazon (department, subcategory, product); Apple (product line, model, configuration).

### 2. Sequential (linear)
A fixed order of steps, each page leading to one next page, with back navigation and no branches.
- Best for: onboarding, checkout, multi-step forms, tutorials, courses, setup wizards.
- Tips: show a progress indicator and remaining steps; let users go back without losing input; one task or decision per step.
- Examples: cart, shipping, payment, confirmation; lesson, quiz, certificate.

### 3. Matrix (network)
Several routes reach the same content through tags, categories, filters and cross-links.
- Best for: knowledge bases, wikis, resource libraries, recipe sites, content-heavy platforms.
- Strength: exploring by topic, format, date, difficulty and so on.
- Risk: too many paths overwhelm users without signposting.
- Tips: strong search and filtering; breadcrumbs or "you are here" cues; limit the number of paths.
- Examples: Wikipedia, Stack Overflow, Spotify.

### 4. Database (dynamic)
Pages generated on demand from queries, filters and stored records via templates; each user may see a different version.
- Best for: product catalogs, listings, job boards, social platforms, CRM dashboards, user-generated or frequently updated content.
- Risks: SEO-critical content missed if rendered only on the client; empty result sets.
- Tips: invest in faceted search, auto-complete and filters; **design empty states with actionable suggestions**; keep dynamic pages crawlable (avoid client-only rendering for SEO-critical content).
- Examples: Airbnb, LinkedIn, Shopify stores.

## Choosing a structure

Most real sites combine models. Match the primary user flow, then layer others on top:
- Stable, categorized content: hierarchical base.
- Ordered tasks: sequential flows for those tasks.
- Exploration across several dimensions: matrix navigation (tags, filters, cross-links) over the hierarchy.
- Dynamic or user-generated content: database structure with strong search.

## Planning steps

1. Audit existing content by topic, purpose and audience.
2. Card sorts: open sorts for new sites, closed sorts for redesigns.
3. Tree tests to measure findability and success rate.
4. Map the hierarchy in a sitemap to find orphaned or buried pages.
5. Prototype navigation and test with real users before development.

## Structural elements

- **Homepage:** a wayfinding hub, not a content dump.
- **Global navigation:** 5 to 7 top-level items; mega menus or dropdowns for subcategories; keyboard accessible and mobile responsive.
- **Breadcrumbs:** show location and give access to parent pages; include them once a site is deeper than two levels.
- **Internal links:** descriptive anchor text, never "click here" (see accessibility.md).
- **URLs:** mirror the hierarchy (`/category/subcategory/page-name/`), short and readable; avoid query parameters, session IDs and deep nesting.
- **Footer:** secondary "safety net" navigation (privacy, contact, sitemap, secondary categories).

## Page-level structure

- One H1 per page, matching the page's purpose or search intent.
- Heading levels in order (H1, H2, H3): useful for scanning and relied on by screen readers.
- Put the primary content and call to action where they are seen first.
- Chunk long content with headings, short paragraphs and separators; link to related pages at the bottom or in a sidebar.

## Key numbers (heuristics)

- Users should reach a page in about 2 to 3 clicks; important pages within 3 from the homepage.
- Hierarchy depth of 3 to 4 levels at most.
- 5 to 7 top-level navigation items at most.
- Breadcrumbs beyond two levels deep.
- **[agent note]** The "3 clicks" figure is a widely repeated rule of thumb, not a hard research-backed limit. Treat it as a prompt to ask whether users can find things easily, not as a pass/fail test. The source's "94% of first impressions are design-related" statistic is unsourced here; it is not included in the skill.

## SEO implications (brief)

A flat, well-linked structure is crawled efficiently; well-connected pages gain authority; Google derives sitelinks from clear structure; pillar pages linked to supporting pages signal topical authority.

## Accessibility and responsive notes

Semantic HTML and a clear heading hierarchy help assistive technology users; navigation must be keyboard accessible and mobile responsive; link text must be descriptive. See accessibility.md.

## Agent checklist

- [ ] State which structure model(s) the product uses and why.
- [ ] Hierarchy no deeper than 4 levels; top-level navigation 7 items or fewer.
- [ ] Breadcrumbs present when deeper than two levels.
- [ ] Sequential flows show progress and preserve input when going back.
- [ ] Matrix and database structures have search, filters and designed empty states.
- [ ] One H1 per page with ordered headings.
- [ ] No orphaned pages; related pages cross-linked.
