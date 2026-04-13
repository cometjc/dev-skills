# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a skill library for the Superpowers agent framework. Each skill lives under `skills/<name>/SKILL.md` and is loaded by the Claude Code harness as a slash command (`/<name>`).

## Skill File Format

Every `SKILL.md` must include YAML frontmatter:

```markdown
---
name: <skill-name>
description: <one-line trigger description shown in skill picker>
---
```

The `description` field is used by the harness to decide when to surface the skill automatically, so it should be a precise trigger statement, not a general summary.

## Adding or Editing Skills

- Place new skills at `skills/<name>/SKILL.md`.
- Use the `writing-skills` skill (`/writing-skills`) when creating or editing skills — it verifies the skill loads correctly before you commit.
- After moving or adding a skill, run `/reload-plugins` in the Claude Code session to hot-reload without restarting.

## Key Skill: `do`

`skills/do/SKILL.md` is the **governance entry point** for the Superpowers workflow. It routes incoming requests to the correct planning/execution skill (`brainstorming`, `writing-plans`, `subagent-driven-development`, `executing-plans`) and enforces worktree isolation and AUQ confirmation guardrails. Read this file before modifying any workflow routing logic.
