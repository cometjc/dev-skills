# Lane 2 - Do/PLD Governance Doc Alignment

PLD worktree: `docs/plans/2026-04-15-do-pld-replacement/run-migrated-lane-2`

> Ownership family:
> `skills/do/SKILL.md`
> `skills/pld/SKILL.md`
> `skills/pld/spec/PLD/communication.md`
> `skills/pld/spec/PLD/guardrails.md`

> Lane-local verification:
> `rg "spec_pass|quality_pass|plugins/parallel-lane-dev/scripts" "skills/do/SKILL.md" "skills/pld/SKILL.md" "skills/pld/spec/PLD/communication.md" "skills/pld/spec/PLD/guardrails.md"`
> `rg "canonical-contract.md" "skills/do/SKILL.md" "skills/pld/SKILL.md"`

## Tasks

- [ ] 收斂 `do/SKILL.md` 為薄路由，狀態語意改引用 canonical
- [ ] 收斂 `pld/SKILL.md`，移除重複狀態定義
- [ ] 修正 `communication.md`，保留 review outcome 與 canonical status 的分界
- [ ] 修正 `guardrails.md`，統一路徑策略與 commit ownership 敘述

## Refill Order

- [ ] 清理剩餘用詞漂移（若 reviewer 要求）

