# Implementation Plan: Do Skill Refinement (2026-04-13)

## Scope
Refine `SKILL.md` for deterministic routing, reduced duplication, and better skill-format compatibility while preserving intended behavior.

## Steps
1. Normalize frontmatter to `name` + `description` only.
2. Remove duplicate routing representation; keep one authoritative deterministic routing section.
3. Add `## Dependencies` section in body.
4. Constrain artifact auto-detection to plan-execution routes only.
5. Simplify AUQ and worktree policies in main doc; move detailed procedures to references.
6. Make evidence checklist route-aware.
7. Create references:
   - `references/auq-runtime.md`
   - `references/worktree-recovery.md`
8. Verify resulting structure and check for conflicting rules.

## Verification
- Ensure straightforward fix path remains direct to `systematic-debugging`.
- Ensure non-obvious feature/bugfix path remains `brainstorming` + `grill-me` before planning.
- Confirm only one authoritative routing rule set exists.
