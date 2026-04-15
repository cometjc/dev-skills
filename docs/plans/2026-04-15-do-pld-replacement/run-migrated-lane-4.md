# Lane 4 - Test Matrix and Migration Notes

PLD worktree: `docs/plans/2026-04-15-do-pld-replacement/run-migrated-lane-4`

> Ownership family:
> `skills/pld/scripts/__tests__/`
> `skills/pld/spec/PLD/migration-notes-2026-04-strict-canonical.md`
> `skills/pld/agents/pld-coder.md`
> `skills/pld/agents/pld-reviewer.md`

> Lane-local verification:
> `node --test skills/pld/scripts/__tests__/*.test.cjs`
> `rg "No compatibility layer|legacy payloads fail" "skills/pld/spec/PLD/migration-notes-2026-04-strict-canonical.md"`

## Tasks

- [ ] 新增測試：legacy rejection、route-state integration
- [ ] 對齊 `pld-coder.md` 與 `pld-reviewer.md` 到 canonical 契約
- [ ] 新增 migration notes，明示嚴格破壞式升級
- [ ] 跑完整測試矩陣並記錄最終驗收結果

## Refill Order

- [ ] 增補測試資料夾命名與測試說明（若 reviewer 要求）

