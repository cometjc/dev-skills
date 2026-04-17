# Minimal Verification Commands

Minimum shell commands for validating routing and post-plan gates under `/do`.

## Base-branch detection

```sh
git symbolic-ref --short refs/remotes/origin/HEAD | sed 's@^origin/@@'
```

Fallback: repository default branch policy when `origin/HEAD` is not set.

## Verify current branch

```sh
git rev-parse --abbrev-ref HEAD
```

## Verify commit reachability from base branch

```sh
git branch --contains <commit_sha>
```

Required evidence before plan cleanup: implementation commit SHA(s) must appear under the detected base branch in this output.

## Verify pending workspace state before cleanup/commit

```sh
git status --short
```

## Routing evidence

When validating first-hit routing, capture in execution notes:

- request condition
- matched row in routing table
- selected route

## Plan-finish definition

"Plan finish" means implementation commits are reachable from base branch. Feature-branch-only commits are `implemented_not_integrated`, not finished.
