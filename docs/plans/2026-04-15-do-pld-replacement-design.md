# /do 整合 parallel-lane-dev 作為 /subagent-driven-development 強化替換版

## 目標與決策摘要

本設計將 `skills/do/SKILL.md` 中原本命中 `subagent-driven-development` 的兩條主路由，改為完整導向 PLD（parallel-lane-dev）執行層：

- `3.b`: `fix-errors` 且 todo 非空  
- `3.d independent`: 既有 plan execution intent 且任務可並行

已確認策略：

1. **替換強度：完全替換**  
   以上兩條路由命中後，不再保留舊 `subagent-driven-development` fallback。
2. **AUQ 決策策略：非阻擋**  
   高成本或不可逆決策觸發 AUQ 時，不凍結整體流程；先持續推進可獨立 lane，待 AUQ 回答後回補 blocked slices。
3. **失敗升級門檻：連續 3 次 gate 失敗**  
   同 lane 在 spec/quality review 連續失敗達 3 次後，才升級人工決策（AUQ）。

本案保持 `/do` 對外語意穩定（使用者仍可說 `fix-errors` 或繼續既有 plan），但把多 lane 調度、claim/report、review 狀態全部下沉到 `pld-tool + SQLite` 作為唯一可寫真相來源。

## 架構與責任邊界

### 1) `do`（治理層）

`do` 仍負責：

- first-hit deterministic routing
- AUQ continuity gate（先檢查 pending session）
- 高風險決策 AUQ 觸發條件
- worktree policy 與 branch/context hard gate（如適用）
- 完工驗證與整合證據要求

`do` 不再承擔 lane 細節狀態推論，也不以 chat/markdown 作執行真相來源。

### 2) PLD（執行層）

PLD 負責：

- `import-plans` / `audit --json` / `go` 的調度循環
- coder `claim-assignment` 與 coder/reviewer `report-result`
- lane 狀態轉移與 queue/refill 邏輯
- multi-lane 併行吞吐控制（`C + R <= cap`）

唯一可寫真相來源為 `.pld/executor.sqlite`（透過 `pld-tool` 寫入）。  
scoreboard、lane markdown、對話僅作可讀投影，不可作控制依據。

### 3) 角色原則

- **Main Agent（Coordinator）**：可跑 `--role coordinator` 操作與最終整合（merge）
- **pld-coder**：實作與回報，不做最終整合
- **pld-reviewer**：spec/quality gate 回報，不 claim assignment

## 路由與狀態機設計

### 路由改動（`do`）

- `3.b` 原 `subagent-driven-development` -> `parallel-lane-dev execution path`
- `3.d independent` 原 `subagent-driven-development` -> `parallel-lane-dev execution path`
- `3.d sequential` 仍維持 `executing-plans`
- 顯式 single-thread 偏好仍優先覆蓋到 `executing-plans`

### PLD 執行狀態機（治理可觀測）

治理層觀測狀態（由 `audit --json` + `report-result` 事件推導）：

`queued -> coding -> spec_review -> quality_review -> ready_to_integrate -> integrated`

失敗分支：

- `spec_review_failed` -> coder 修復 -> 新 reviewer 重跑 spec gate
- `quality_review_failed` -> coder 修復 -> 新 reviewer 重跑 quality gate

同 lane gate 連續失敗計數達 3 時，觸發升級 AUQ。

## AUQ 非阻擋回復模型

### 觸發條件

高風險、不可逆或成本高決策（例如是否重切 lane、是否降級範圍、是否中斷某執行）必須 AUQ，不得 plain chat。

### 非阻擋流程

1. 發送 AUQ（`nonBlocking: true`），保存 `session_id`。
2. 將受影響 lane 標記為 `blocked_slice`，不在當前迴圈派工。
3. 主迴圈持續調度其他可獨立 lane。
4. 每輪起始輪詢 AUQ 答案；若 answered，恢復對應 blocked slice。
5. timeout/pending 時維持局部阻塞，不中斷全域吞吐。

此模型符合 `ask-me` contract，也避免 `fix-errors` 被單點決策卡死。

## 失敗復原與安全欄杆

- 每 lane 僅允許一個活躍 coder（避免同 lane 競寫）
- reviewer 必須是新 subagent 進行 re-review（避免上下文污染）
- 連續失敗 1-2 次：自動修復迴圈
- 連續失敗第 3 次：升級 AUQ 決策
- 最終整合僅 Main Agent 執行；coder/reviewer 禁止 merge
- 決策與狀態切換依據僅來自 `pld-tool` 事件，不讀聊天狀態

## 驗證矩陣（最小必須）

### A. Routing

1. `fix-errors + todo` 命中 -> PLD 路徑（非舊 subagent-driven-development）
2. existing plan + independent -> PLD 路徑
3. existing plan + sequential -> `executing-plans`
4. explicit single-thread -> `executing-plans`

### B. AUQ / Recovery

1. 高風險決策觸發 AUQ（非阻擋）並記錄 session
2. AUQ pending 時其他 lane 持續前進
3. AUQ answered 後可準確恢復對應 blocked slice
4. 同 lane 連續失敗第 3 次觸發升級 AUQ

### C. PLD 事實一致性

1. `report-result` 事件可在 `audit --json` 反映
2. spec gate 與 quality gate 皆通過後才進入 `ready_to_integrate`
3. 最終整合由 Main Agent 完成，且整合證據可追溯

## 實施切片（建議）

1. **Doc 切片（本回合）**：完成此設計稿，凍結策略與驗證標準。  
2. **Governance 切片**：更新 `skills/do/SKILL.md` 的 routing table、execution path、validation matrix。  
3. **Ops 切片**：補 `do` 對 PLD 操作序列的最小指令範本（coordinator/coder/reviewer）。  
4. **Verification 切片**：新增/更新對應測試或檢核腳本，覆蓋路由與 AUQ 非阻擋行為。

---

此設計文件完成後，即可進入下一步：直接修改 `skills/do/SKILL.md` 進行落地。
