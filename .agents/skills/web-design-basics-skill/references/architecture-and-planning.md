# Architecture and planning

Condensed from: Galorath (project dependencies), Bitloops (Clean Architecture), scalablebackend.com (Martin's component principles), Study.com (class-based components), IBM RUP (state management for services), W3C TAG Web Platform Design Principles. Most sources are backend or spec-author oriented; items marked **[agent note]** are my translation to web work. **Size the process to the project:** a landing page or small CRUD UI needs almost none of this.

## 1. Plan by dependency

- Dependency types: **mandatory** (physics of the work: no page before content model), **discretionary** (preferred order), **external** (other teams, vendors, APIs), **internal**.
- Relationships: finish-to-start (default), start-to-start, finish-to-finish, start-to-finish (rare). **Lead** overlaps tasks; **lag** inserts a wait.
- **Critical path:** the longest chain of dependent tasks sets the earliest finish; delay anything on it and the whole project slips. Slack exists only off the path.
- **[agent note]** Typical web order: goals and content → information architecture → tokens and spacing scale → components → pages → integration. Start external dependencies (API contracts, copy, brand assets, approvals) first because you cannot control their timing. State the critical path and blockers at the top of any multi-step plan.

## 2. Layer code; dependencies point inward

- Layers, inside out: **entities** (core business rules) → **use cases** (orchestration) → **adapters** (controllers, repositories, presenters: translation only) → **frameworks/drivers** (web framework, DB, UI library: wiring).
- **Dependency rule:** source imports point inward only. Domain code never imports a framework, database or UI library; inject implementations through interfaces at the edge.
- Mistakes: entities holding repositories or loggers; controllers containing business logic; repositories that are thin query wrappers; use cases importing concrete databases; more layers than the problem needs.
- **Overkill for:** prototypes, small CRUD apps, static sites. Worth it for complex business logic, several delivery mechanisms over one domain, or volatile infrastructure.
- **AI agents:** do not add cross-layer imports for convenience; they work locally and erode structure.
- **[agent note] Front end:** keep business rules (pricing, validation, state transitions) in plain modules that do not import React or the DOM; hide data access behind thin service modules; treat UI components as the outer layer that renders state and forwards actions.

## 3. Package and module boundaries

"Component" here means a deployable unit (package/module group), not a UI widget.
- **Cohesion:** things released together belong together and must be versioned (REP); things that change for the same reason live together (CCP); do not force consumers to depend on what they do not use (CRP). REP/CCP pull toward grouping, CRP toward splitting.
- **Coupling:** no dependency cycles (ADP; break with dependency inversion or a new shared package); depend toward stability (SDP); stable packages should be abstract, volatile ones concrete (SAP).
- **[agent note]** Tokens and primitives sit at the bottom and change rarely; feature and page code sits on top. Dependencies run top to bottom only. Avoid a catch-all `utils` package. Class-based component design in short: modular, cohesive, reusable, documented; expose only what is necessary.

## 4. State

- **Prefer stateless handling.** Server holding conversation state is a risk (crash, failover, load balancing needs a shared store). Statefulness is justified only when the service holds state for the client, manages a stateful resource, or has an ordered protocol.
- If state is needed: put it in each request (larger messages, easy scaling) or send an ID and persist server-side (smaller messages, more server load).
- Model ordered flows (checkout, onboarding, publish/approve) as an explicit **state machine**: named states, allowed transitions. Use the same model in UI and backend.
- Do not hold transactions open across several calls or user wait time; use compensating actions.
- **[agent note]** Keep shareable view state (filters, tabs, pagination) in the URL; persist in-progress input so a failure does not wipe it.

## 5. Designing component and module APIs (W3C TAG, adapted)

- **User needs beat author convenience, which beats implementer convenience, which beats purity.** Make the common case easy; offer a high-level path plus a low-level escape hatch.
- Be consistent inside the project first, then with the wider ecosystem. Make new features detectable.
- Props: **options objects over positional booleans** (the boolean trap), sensible defaults, no side effects or heavy work when reading a value, one purpose per element or prop name, names that do not overload meanings.
- CSS: inherit when descendants should override, do not inherit when they should add; unitless `line-height`; content visible and unclipped by default.
- Trust and data: no fake system UI, request the least data and permission, ask only at the moment of need, and give a way to undo.

## Agent checklist

- [ ] Plan lists dependencies, external blockers and the critical path.
- [ ] Architecture weight matches project size.
- [ ] Imports point inward; no domain code imports a framework or UI library.
- [ ] No cycles between modules or packages; depend toward the stable code.
- [ ] State is stateless by default; ordered flows have an explicit state machine.
- [ ] Component APIs use options objects and defaults; reads have no side effects.
