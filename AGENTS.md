# paraslides: AI Agent & Contributor Instructions

> **paraslides** stands for parallel decks for extra slides, parallax depth, and paragliding through 3D slides all at once.

## 1. Mandatory Context Loading

Before planning, writing, or modifying any code, you MUST read the following
project specification files in this exact order:

1. `docs/ARCHITECTURE.md` — Hexagonal boundaries (Core vs. Ports vs. Adapters)
   and directory rules.
2. `docs/DOMAIN_SPEC.md` — The 3-axis coordinate math, `MAIN` vs. `DETOUR` mode
   transitions, and cursor memory (`lastX`, `lastZ`).
3. `docs/HTML_SCHEMA.md` — Semantic DOM structure, data attributes, CSS custom
   properties, and HUD contract.
4. `docs/ROADMAP.md` — Active phase deliverables and anti-goals.
5. `docs/WORKFLOW.md` — Multi-agent sprint dispatch, ticket lifecycle, and
   escalation hierarchy.

---

## 2. Hard Architectural Guardrails

- **Strict Hexagonal Isolation:** Code inside `src/core/` must remain 100% pure
  JavaScript. Never reference `window`, `document`, DOM elements, CSS classes,
  or KeyboardEvents inside `src/core/`.
- **Port-Driven Communication:** All user input must flow through an Inbound
  Adapter into an Inbound Port. All UI/DOM updates must be triggered by
  subscribing an Outbound Adapter to the Outbound State Port.
- **No Sparse Grid Padding:** Never generate clone or placeholder DOM nodes to
  fill empty `(y, x, z)` coordinates. Only actual slides exist in the DOM and
  Core Topology.
- **Zero External Runtime Dependencies:** Do not introduce npm frameworks
  (React, Vue, Tailwind, etc.) or build-step lock-in for the Phase 1 HTML
  engine. Everything must run natively in a standard browser.

---

## 3. Navigation & State Machine Invariants

When implementing or testing navigation logic, enforce these exact invariants
from `DOMAIN_SPEC.md`:

1. **`MAIN_MODE` (`z === 0`):**
   - `MOVE_LEFT` (`h`) / `MOVE_RIGHT` (`l`) navigates pages (`x`) within the
     current section (`y`) and updates `lastX[y]`.
   - `MOVE_UP` (`k`) / `MOVE_DOWN` (`j`) switches sections (`y`) and restores
     `x = lastX[new_y]`.
   - `ENTER_DETOUR` (`i`) transitions to `DETOUR_MODE` (`z > 0`) only if the
     current `(y, x)` page has detour slides (`Z_max(y, x) > 0`).
2. **`DETOUR_MODE` (`z > 0`):**
   - `MOVE_LEFT` (`h`) / `MOVE_RIGHT` (`l`) scrubs through the attached detour
     sequence (`z = 1 ... Z_max(y, x)`) and updates `lastZ[y][x]`.
   - `MOVE_UP` (`k`) / `MOVE_DOWN` (`j`) are **strictly locked** (no-op on
     coordinates; emit vertical-lock feedback in state payload).
   - `EXIT_DETOUR` (`o` / `Escape`) immediately returns to `z = 0` (`MAIN_MODE`)
     at the parent `(y, x)` coordinate.

---

## 4. Workflow & Execution Rules

- **Stick to the Active Phase:** Only implement features from **Phase 1** in
  `ROADMAP.md` unless explicitly instructed by the user to start Phase 2 or
  Phase 3.
- **Test-First Core:** Whenever modifying `src/core/`, write or update pure unit
  tests verifying state transitions and edge boundaries before wiring DOM
  adapters.
- **Small, Verifiable Steps:** Propose and implement one layer at a time
  (e.g., 1. Core State Machine -> 2. Ports -> 3. DOM Loader & Renderer -> 4.
  Keyboard Adapter & HUD).

---

## 5. Multi-Agent Sprint, Ticket & Escalation Protocol

When operating under multi-agent orchestration, enforce the rules defined in
`docs/WORKFLOW.md`:

1. **Main Orchestrator:** Dispatches sprints and tickets to worker agents.
2. **Clean Sprint (Level 0):** If all tickets in the sprint are marked `DONE`
   with 100% test pass rate and zero blocking notes, proceed directly to the
   next sprint.
3. **Partial Notes / Retrospective (Level 1):** If tickets are finished but
   contain notes regarding partial work or non-critical debt, spawn a
   **Gemini Flash High** agent to review the deltas and supply concrete retro
   suggestions and follow-up tickets.
4. **Errors / Scope Restructuring (Level 2):** If tickets encounter failures,
   blocked states, or significant scope deviations, spawn a **Sonnet** agent to
   conduct root-cause triage, reorganize subsequent sprints, or update the
   epic.
5. **Breaking Architectural Changes (Level 3):** If critical or breaking
   architectural revisions are required (e.g., core coordinate model refactor,
   breaking hexagonal boundaries), **HALT and explicitly prompt the user** to ask
   if an **Opus** agent should be spawned. Never spawn an Opus agent without
   explicit user approval.

---

## 6. Continuous Documentation & Granular Git Commit Protocol

1. **Continuous Documentation Updates:**
   - Whenever new capabilities, adapters, syntax delimiters, CLI commands, or
     format parsers are added or modified, agents **MUST update `README.md`**
     (and any relevant specification file) in the same ticket or sprint.
   - Documentation must never drift or become stale.

2. **Granular Git Commits (One Commit Per Ticket):**
   - **Never** squash an entire sprint or phase into a single monolithic commit.
   - Every completed ticket must produce an **atomic, discrete git commit**
     immediately after its tests pass and its acceptance criteria are satisfied.
   - **Staging Hygiene:** Stage only the specific files relevant to the ticket
     (`git add <file1> <file2> ...`), avoiding blind `git add .` whenever possible.

3. **Conventional Commit Standard:**
   - Commit messages must follow the Conventional Commits specification:
     `type(scope): concise description`
    - **Do not** include ticket IDs, sprint numbers, or other internal process
      references in commit messages. Tickets and sprints are internal agent
      organization; the commit message must describe the change itself.
   - Allowed types: `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `chore`.
   - Examples:
     - `feat(ports): implement serialization port and format registry`
     - `feat(parsers): implement markdown inbound adapter and delimiters`
     - `feat(parsers): implement latex math rendering integration`
     - `feat(parsers): implement bidirectional latex beamer adapter`
     - `test(integration): add phase 3 end-to-end format translator tests`
     - `docs(readme): update documentation with phase 2 and phase 3 features`

