# Do Skill Refinement Design (2026-04-13)

## Objective
Refine the `do` skill into a stable, concise orchestration entrypoint with deterministic routing, minimal duplication, and better compatibility with stricter skill frontmatter expectations.

## Scope
- In scope:
  - Keep behavior intent unchanged where possible.
  - Make routing deterministic with a single source of truth.
  - Remove duplicated/competing rule definitions.
  - Move long operational details (AUQ/worktree diagnostics) to references.
  - Align frontmatter to minimal cross-ecosystem format.
- Out of scope:
  - Changing semantics of downstream skills (`brainstorming`, `systematic-debugging`, etc.).
  - Introducing new runtime capabilities.

## Constraints
- Preserve user policy:
  - Non-obvious new feature/bugfix -> `brainstorming` + `grill-me` before planning.
  - Straightforward fix -> no plan/spec gate, go directly to `systematic-debugging` execution.
- Keep `do` as governance/orchestration layer.

## Proposed Architecture
`SKILL.md` becomes a thin orchestrator contract:
1. Trigger contract (what requests should route to `do`)
2. Single deterministic routing table (first-match wins)
3. Execution contract (how selected route is executed)
4. Escalation/fallback contract (when to use AUQ)
5. Evidence checklist (route-aware)

Operational details move to ask-me MCP tool documentation:
- `../ask-me/scripts/ask-user-questions-mcp/skills/ask-user-questions/SKILL.md`
- `references/worktree-recovery.md`

## Component Design
### 1) Frontmatter
- Keep only:
  - `name`
  - `description`
- Remove `dependencies` from frontmatter.
- Add dependency list in body section `## Dependencies`.

### 2) Routing
- Keep one authority section only:
  - `## Routing Priority (Deterministic)`
- Remove or convert `Hand-off Mapping` into non-normative summary.
- Rule order remains explicit and first-match.

### 3) Artifacts Rule
- Narrow artifact auto-detection:
  - Apply only when route family is plan-execution.
  - Do not preempt straightforward bugfix route.

### 4) AUQ Strategy
- Keep AUQ policy in `do`, but offload procedural details to AUQ MCP semantics and tool documentation.
- Main doc keeps only decision points:
  - when to ask,
  - when to continue independently,
  - when to resume blocked slices.

### 5) Worktree Failure Handling
- Keep short policy in main doc.
- Move detailed diagnostics/remediation matrix to `references/worktree-recovery.md`.

### 6) Evidence Checklist
- Make checklist route-aware:
  - `systematic-debugging`
  - `subagent-driven-development`
  - `executing-plans`

## Control Flow
1. Parse request intent.
2. Match deterministic routing rules (first-match).
3. Execute route contract.
4. If ambiguity/risk -> AUQ decision gate.
5. Record route-aware evidence.

## Error Handling
- Ambiguous route -> AUQ clarification.
- Worktree add failure -> follow referenced recovery procedure.
- AUQ timeout -> continue independent slices and mark blocked slices resumable.

## Validation Plan
Use a minimal route matrix:
1. `/do ~N` -> list only
2. straightforward bugfix -> `systematic-debugging` direct
3. non-obvious bugfix -> `brainstorming` + `grill-me` before `writing-plans`
4. explicit single-thread request -> `executing-plans`
5. `fix-errors` + non-empty todo -> direct subagent route

## Acceptance Criteria
- One authoritative routing section only.
- No frontmatter fields beyond `name` + `description`.
- AUQ/worktree detail extracted to references and linked.
- Straightforward-fix bypass remains explicit.
- Non-obvious fix path remains explicit.
- Route matrix can be traced without conflicting rules.
