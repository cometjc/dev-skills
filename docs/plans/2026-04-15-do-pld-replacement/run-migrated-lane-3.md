# Lane 3 - PLD Tool Strict Validator and Error Contract

PLD worktree: `docs/plans/2026-04-15-do-pld-replacement/run-migrated-lane-3`

> Ownership family:
> `skills/pld/scripts/pld-tool.cjs`
> `skills/pld/scripts/pld-tool-lib.cjs`

> Lane-local verification:
> `node --test skills/pld/scripts/__tests__/pld-tool-lib.validator.test.cjs`
> `node --test skills/pld/scripts/__tests__/pld-tool.cli-errors.test.cjs`

## Tasks

- [ ] 在 `pld-tool-lib.cjs` 建立 canonical status/phase/transition 驗證器
- [ ] 在 `pld-tool.cjs` 建立結構化錯誤輸出（code/message/expected/received/hint）
- [ ] 依錯誤類型固定 exit code：2 契約、3 ACL、4 路徑/上下文
- [ ] 移除 legacy alias/fallback，舊 payload 一律拒絕

## Refill Order

- [ ] 補充 validator 單元測試缺口（若 reviewer 要求）

