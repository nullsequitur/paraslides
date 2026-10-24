# paraslides: Multi-Agent Sprint & Ticket Workflow

This document specifies the orchestration protocol for autonomous and pair-programmed sprints, ticket execution, retrospective evaluation, and multi-tiered model escalation.

---

## 1. System Roles & Model Allocation

The workflow operates under a hierarchical dispatch and escalation model:

```
                      +-----------------------------+
                      |   Main Orchestrator Agent   |
                      |   (Sprints & Ticket Dispatch)|
                      +--------------+--------------+
                                     |
                       Dispatches tickets to workers
                                     |
                                     v
                      +-----------------------------+
                      |       Ticket Workers        |
                      |  (Executes discrete tasks)  |
                      +--------------+--------------+
                                     |
                             Sprint Completion
                                     |
           +-------------------------+-------------------------+
           |                         |                         |
           v                         v                         v
     [Level 0: Clean]       [Level 1: Partial]         [Level 2: Errors/Scope]
All tickets 100% DONE      Notes on partial items     Failures, blockers, bugs
           |                         |                         |
           v                         v                         v
  Proceed to next sprint    Gemini Flash High Agent         Sonnet Agent
                             (Retro review & delta)   (Restructure sprints/epic)
                                                               |
                                                               v
                                                    [Level 3: Breaking Changes]
                                                    Architecture/Core Redesign
                                                               |
                                                               v
                                                    PROMPT USER FOR OPUS
```

### Roles Breakdown

1. **Main Orchestrator Agent (Gemini Flash Medium / High):**
   - **Assigned Model:** Gemini Flash Medium by default; upgraded to Gemini Flash High if extensive architectural synthesis or high reasoning depth is required.
   - Reads the project specification epics (`ROADMAP.md`, `DOMAIN_SPEC.md`, `ARCHITECTURE.md`, `HTML_SCHEMA.md`).
   - Generates structured sprint plans and discrete ticket markdown files.
   - Dispatches tickets to worker subagents.
   - Evaluates completed sprint outcomes and coordinates retrospectives or escalations.
2. **Worker Agents (Gemini Flash / Inherit):**
   - Implement designated tickets following test-first hexagonal constraints.
   - Serial execution for Core domain logic (`src/core/`) to maintain state machine invariants.
   - Parallel execution permitted for independent adapters (`src/adapters/`).
   - Mark tickets as `DONE`, `PARTIAL`, or `BLOCKED` with explicit notes.
3. **Retrospective Review Agent (Gemini Flash High):**
   - Triggered when all tickets finished but contain notes on partial implementations, uncovered edge cases, or minor technical debt.
   - Evaluates ticket deltas, tests, and diffs.
   - Writes retrospective report to `docs/sprints/sprint-NN/retro.md` and generates follow-up ticket stubs for `docs/sprints/sprint-NN+1/`.
4. **Strategic Escalation Agent (Sonnet):**
   - Triggered when tickets encounter breaking errors, recurring test failures, or cross-cutting scope blocks.
   - Performs root-cause analysis, resolves architectural mismatch, updates `docs/sprints/sprint-NN/retro.md`, and restructures future sprints or epic definitions in `ROADMAP.md`.
5. **Critical Architecture Agent (Opus):**
   - Reserved strictly for existential, foundational, or breaking architectural redesigns (e.g., coordinate system overhaul, breaking hexagonal boundaries).
   - **Hard Rule:** Never spawned automatically. The Main Orchestrator must halt and explicitly prompt the user for permission before spawning an Opus agent.

---

## 2. Four-Tier Escalation Matrix

| Level | Severity | Trigger Criteria | Assigned Handler | Action / Output |
| :--- | :--- | :--- | :--- | :--- |
| **0** | **Green** | All sprint tickets marked `DONE` with 100% test pass rate and zero open debt notes. | **Main Orchestrator** *(Gemini Flash Medium/High)* | Immediate transition to the next sprint plan. |
| **1** | **Yellow** | All tests pass, but tickets contain notes on partial features, uncovered edge cases, or non-critical debt. | **Gemini Flash High** | Writes `retro.md` and generates targeted punch-list tickets for the next sprint. |
| **2** | **Orange** | Any ticket marked `BLOCKED`, failing unit tests, or scope deviation from the epic. | **Sonnet** | Root-cause analysis, updates `retro.md`, restructures future sprint backlogs or adjusts the epic. |
| **3** | **Red** | **Critical, breaking architectural changes** (e.g., core coordinate model failure, fundamental state machine redesign). | **Opus** *(User-Gated)* | **Halt and prompt user:** *"Breaking architectural changes detected in [area]. Requesting approval to spawn an Opus agent."* |

---

## 3. Ticket & Sprint Lifecycle

### Directory Structure

```
docs/sprints/
├── sprint-01/
│   ├── sprint.md           # Goals, scope, and ticket index
│   ├── ticket-01-core.md   # Discrete worker task specification
│   ├── ticket-02-ports.md
│   └── retro.md            # Generated retro analysis (Flash or Sonnet)
└── sprint-02/
```

### Ticket Schema Template

```markdown
# Ticket: [ID] - [Title]

- **Status:** TODO | IN_PROGRESS | DONE | PARTIAL | BLOCKED
- **Sprint:** [Sprint ID]
- **Target Layer:** Core | Ports | Adapters
- **Assigned Model Tier:** Default / Inherit

## 1. Objective
[Concise description of the task]

## 2. Acceptance Criteria
- [ ] Criterion 1 (with unit test reference)
- [ ] Criterion 2

## 3. Worker Notes & Retro Feedback
[Populated by worker upon completion; notes any partial status, edge cases, or blocks]
```

---

## 4. Retrospective Protocol

1. **Sprint Concurrency:** The Main Orchestrator monitors all dispatched tickets in the active sprint folder.
2. **Evaluation Phase:** Once all worker agents finish:
   - If clean &rarr; Proceed directly.
   - If partial &rarr; Invoke Gemini Flash High with prompt:
     `"Review the completed tickets and notes in docs/sprints/sprint-NN/. Synthesize retro recommendations and draft follow-up ticket specifications."`
   - If errors/scope issues &rarr; Invoke Sonnet with prompt:
     `"Perform a root-cause review of failures in docs/sprints/sprint-NN/. Determine necessary adjustments to the roadmap, epic, and subsequent sprints."`
   - If breaking/existential &rarr; Stop all workers and prompt the human user:
     `"A breaking architectural issue has been encountered: [Summary]. Do you want to spawn an Opus agent to resolve this?"`

---

## 5. Continuous Documentation & Granular Git Commit Protocol

1. **Continuous Documentation Updates:**
   - Any new feature, syntax delimiter, or adapter must be documented in `README.md` concurrently with the code changes.
   - Documentation is considered a first-class deliverable of every sprint.

2. **Atomic Git Commits Per Ticket:**
   - Once all unit tests for a ticket pass and its acceptance criteria are checked off:
     - Stage only the relevant module and test files: `git add <files>`.
     - Commit using Conventional Commits with ticket reference:
       `git commit -m "<type>(<scope>): [<TICKET-ID>] <summary>"`
   - Maintain a clean, bisectable git history where each commit represents a single verifiable increment.

