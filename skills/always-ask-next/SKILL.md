---
name: always-ask-next
description: Before declaring all tasks complete, always call ask-user-questions MCP (ask_user_questions) using a multiple-choice question with 10 dynamically generated next-action options. MANDATORY — no exceptions.
metadata:
  {
    "origin": "https://github.com/endman100/skill-always-ask-next",
    "modified": "routed to ask-user-questions MCP instead of built-in AskUserQuestion"
  }
---

# Always Ask Next

## 此 Skill 適用於

Agent 完成所有任務、準備宣告結束之前，強制透過 `ask-user-questions` MCP 詢問使用者下一步，避免自行假設結束點或遺漏後續行動。

---

## 規則

**Before finishing all tasks, always call `ask_user_questions` (MCP: `ask-user-questions`) once, asking the user what to do next as a multiple-choice question.**

⚠️ 不要先用一般文字訊息獨立總結任務狀態，再另外送出 `Next Action` AUQ。
必須把「狀態總結」與「下一步提問」合併在同一次 AUQ 中，讓使用者看到問題時就已帶著足夠上下文。

- `title`: `"Next Action"`（11 chars，符合 ≤12 限制）
- `prompt`: 必須包含簡短狀態摘要，再接下一步提問；例如先交代這次完成了什麼、是否有失敗或阻塞、目前還剩什麼風險，然後再問使用者下一步
- `options`: 根據當前執行脈絡，動態生成 **至少 10 個**最相關的後續行動（建議 10 到 26）；推薦項置頂；以 AUQ 的選項結構呈現
- `options` 內必須固定包含一個收尾選項：`將本輪選項做完後結束`
- 推薦項優先規則：若偵測到有「未 commit 變更」，第一項推薦固定為
  - 使用 `git worktree` 時：`先 rebase 到 main，再 fast-forward 回主 worktree`
  - 非 `git worktree` 流程時：`commit 本次變更`
- `multiSelect`: `true`（預設即為可多選，除非未來有極特殊理由，不要改成單選）
- `nonBlocking`: `false`（此問題位於關鍵路徑，沒有獨立 slice 可以繼續）

⚠️ 問題型態必須是 multiple choice（有 `options` 的題目）；不得改成開放式自由輸入題。

⚠️ 強制規則，不可跳過；不可用 Claude 內建 `AskUserQuestion` 取代 MCP；**不得手動加入 `Other` 選項**（AUQ 工具本身提供）。

⚠️ 送出 AUQ 時，tool call 本身的描述/上下文也必須帶上狀態報告，不可只丟一句抽象的「下一步想做什麼？」。目標是讓 AUQ 問題本身就攜帶足夠前後文，而不是依賴前一則 assistant 訊息做補充。

⚠️ `Next Action` AUQ 一律使用 `"nonBlocking": false`。這是收尾關鍵路徑，不可改成 `true` 後在背景等答案。

⚠️ **同回合延續執行是預設行為。**  
當 `ask_user_questions(nonBlocking: false, ...)` 已成功回傳答案時，Agent **預設必須在同一輪立即開始執行使用者所選的後續動作**；不得只回覆「收到」或只做摘要後就停住，除非符合以下少數例外：

- 使用者選項彼此衝突，必須先再做一次 AUQ / clarify 才能安全決策
- 使用者選的是純收尾選項（例如只要求結束、不再繼續執行）
- 當前環境真的無法在本輪繼續（例如必要工具不可用、權限不足、或外部阻塞），且回覆中必須明講阻塞點

⚠️ **多選題的預設解讀是「執行」而不是「參考」。**  
若使用者在 `Next Action` 選了多個項目，Agent 應把它們視為本輪待辦，按合理順序直接開始做；不可把多選結果當成下輪候選清單後就結束。

⚠️ **若答案已足夠明確，就不要再插入一則純確認訊息。**  
拿到 blocking AUQ 的答案後，應直接執行；只有在答案之間互斥、缺必要參數、或存在高風險副作用時，才允許再補一次澄清。

⚠️ **`Next Action` AUQ 不是收尾問卷，而是下一段執行流程的入口。**  
送出 blocking AUQ 後，整個回合尚未結束；只有兩種情況可結束本回合：

- 已依答案開始執行並完成這輪所選工作
- 因明確阻塞而無法繼續，且已在同回合清楚交代阻塞點

⚠️ **若 `ask_user_questions(nonBlocking: false, ...)` 已回傳答案，預設禁止直接輸出 final closeout 後結束。**  
除非使用者選的是純收尾/停止，否則 final 回覆必須建立在「已實際做了答案指定的事」之上，而不是只描述打算去做。

⚠️ **若本輪的 `Next Action` 已取得答案，且答案可直接執行，Agent 應把該答案視為「本輪仍在進行中」而非「下一輪待辦」。**

### 防止範例錨定（避免影響選項方向）

- 範例只示範「資料結構與格式」，**不得直接複製範例 label/description 語意**到實際提問。
- 實際輸出的每個 label 都必須符合 A-Z 編號格式（例如 `A. ...`、`B. ...`），不可省略編號。
- 真正輸出的選項必須來自「當前任務狀態」與「本 session 或記憶系統中可得的偏好訊號」。
- 生成流程建議：先產生候選集合，再依情境相關性、可執行性、歷史偏好加權排序，最後放入推薦項。
- 若情境訊號不足，先用 AUQ 補問關鍵偏好，再產生下一步選項；不可用靜態範例硬套。
- 範例中的 `<...>` 佔位符一律視為模板 token，不是預設內容。

---

## 執行方式

1. 完成當前所有任務後、宣告完成前，先整理 1 段短狀態摘要（已完成、未完成、失敗/阻塞、風險），再把這段摘要直接放進 AUQ 的 prompt 與 tool call 描述。
2. 呼叫 MCP 工具 `mcp__ask-user-questions__ask_user_questions`，且明確傳入 `"nonBlocking": false`。
3. 依 AUQ 契約組裝 `questions`：1 題、`title` 短、推薦項置頂、無手動 `Other`。
   同時固定加入 `將本輪選項做完後結束` 這個收尾選項。
4. 等待回傳（blocking）後，立即把答案轉成本輪待辦並開始執行；若為多選，按合理順序直接執行，不要先停在摘要。
5. 只有在答案彼此衝突、缺必要資訊、或存在高風險副作用時，才再做一次 AUQ / clarify。
6. 若選擇「Other / elaborate」則讀取自訂輸入再路由。

### 強制流程（收到答案後）

把這段當成強制控制流程，而不是建議：

1. `ask_user_questions(nonBlocking: false, ...)`
2. 收到答案
3. 解析出本輪待辦
4. 立即開始執行第一個待辦
5. 完成後繼續執行同輪其餘已選項目
6. 只有在全部已選項目完成，或遇到明確阻塞時，才允許進入 final 回覆

禁止替代流程：

- 收到答案後先發一則「我接下來會...」
- 收到答案後只做摘要，不動手
- 把答案視為下輪計畫而不是本輪指令
- 先 final，再把真正執行留到下一輪

### 答案轉待辦規則

- 單選：直接把該選項視為本輪唯一待辦，立即執行。
- 多選：依「會改狀態的實作 -> 驗證/測試 -> 說明/展示 -> commit/收尾」的順序執行。
- 若包含 `將本輪選項做完後結束`：這不是一個獨立任務，而是本輪收尾旗標；代表其他被選項目做完即可結束。
- 若同時有 `commit 本次變更` 與實作/測試：先完成實作與驗證，再 commit。
- 若有單一選項其實只是「檢視/列出/規劃」且使用者明確選了它，也要在同輪實際產出結果，不可只回覆會去整理。

### 同回合執行優先順序

- 若使用者多選且包含「實作 / 驗證 / commit / 說明」等混合項目，預設順序是：
  1. 先做會改變工作樹或系統狀態的項目
  2. 再做驗證與測試
  3. 再做展示、摘要、commit message 等說明性項目
  4. 若也選了 `commit 本次變更`，則在相關實作與驗證完成後再 commit
- 若使用者同時選了 `將本輪選項做完後結束`，表示「把這輪選中的項目全部做完即可收尾」，不是要求先停住。

### 反模式

以下都視為違反本 Skill 目的：

- AUQ 回答回來後，只回「收到，我接下來會...」但沒有在同輪開始做
- 把多選答案改寫成「我理解你的偏好是...」後直接結束
- 在答案已經足夠明確時，又額外追問一次只是為了形式確認
- 先做完整收尾訊息，再把真正執行留到下一輪
- 問完 `Next Action` 後，把 user choice 當成「下個 turn 的候選方向」
- final 訊息只報告使用者選了什麼，卻沒有證據顯示已實際執行
- 使用者已選 `開 rebuild branch`，但回覆停在「下一步我會開 branch」

### 自我檢查清單

送出 final 前，至少快速檢查一次：

- `Next Action` 的 blocking AUQ 是否已回傳答案？
- 若已回傳，這些答案是否已在本輪實際執行？
- final 內容是在回報「已做的事」，還是在回報「打算做的事」？
- 若還只是打算，代表流程尚未完成，不應進 final。

---

## 範例呼叫

下例示範一個更完整的 Markdown prompt。重點不是文案本身，而是結構：
- 先用 1-3 句摘要交代現況
- 再用短清單列出已完成 / 殘留風險 / 阻塞
- 最後才接 `接下來你希望我做什麼？`

```json
{
  "nonBlocking": false,
  "questions": [
    {
      "title": "Next Action",
      "prompt": "**目前狀態**\\n已完成：<一句摘要這次完成的主要工作>\\n\\n- 已驗證：<已通過的測試 / smoke check>\\n- 殘留風險：<若無則寫無>\\n- 阻塞：<若無則寫無>\\n\\n**Next Action**\\n接下來你希望我做什麼？",
      "multiSelect": true,
      "options": [
        {
          "label": "A. <動態生成選項 1 (Recommended)>",
          "description": "<由當前任務上下文 + 偏好訊號排序後的最高優先項>"
        },
        {
          "label": "B. <動態生成選項 2>",
          "description": "<同目標但不同風險/成本的替代路徑>"
        },
        {
          "label": "C. <動態生成選項 3>",
          "description": "<依目前阻塞點推導出的可執行延伸>"
        },
        {
          "label": "D. <動態生成選項 4>",
          "description": "<偏向驗證或確認假設的下一步>"
        },
        {
          "label": "E. <動態生成選項 5>",
          "description": "<偏向實作推進的下一步>"
        },
        {
          "label": "F. <動態生成選項 6>",
          "description": "<偏向測試/驗證的下一步>"
        },
        {
          "label": "G. <動態生成選項 7>",
          "description": "<偏向文件化或知識沉澱的下一步>"
        },
        {
          "label": "H. <動態生成選項 8>",
          "description": "<偏向風險控制或回退安全的下一步>"
        },
        {
          "label": "I. <動態生成選項 9>",
          "description": "<可平行進行且不阻塞主線的任務>"
        },
        {
          "label": "J. <動態生成選項 10>",
          "description": "<符合當前完成度的收尾或交付選項>"
        },
        {
          "label": "K. 將本輪選項做完後結束",
          "description": "先把這次已選的後續動作完成，做完就收尾，不再額外延伸新工作。"
        }
      ]
    }
  ]
}
```

### Markdown Prompt 寫法建議

- 可以使用粗體標題，例如 `**目前狀態**`、`**Next Action**`
- 可以使用短清單列出 `已驗證`、`殘留風險`、`阻塞`
- 避免長篇報告；狀態摘要通常控制在 3-6 行最合適
- `prompt` 內的 Markdown 應該是為了提高可讀性，不是為了塞完整 changelog

---

## 與 `ask-me` skill 的關係

本 skill 僅規範「完成前必問下一步」的觸發時機與 1 題模板；所有 AUQ 工具契約（title 長度、options 數量、recommended 標註、session_id 處理、blocking vs non-blocking 判準等）一律以 `ask-me` skill 為準，兩者不得衝突。若兩者規則矛盾，以 `ask-me` 為準。

## Completion Guardrail

- 除非使用者明確要求「先結束/停止」，否則每次回覆結尾都要觸發一次 `Next Action` AUQ。
- 若使用者本輪已明確選擇 `將本輪選項做完後結束`，則完成該輪已選動作後，不再再次觸發 `Next Action`。
- 不可在「已完成/已提交」後先發一段獨立狀態總結再結束；必須把狀態總結直接併入 `Next Action` AUQ。
- 規則說明、除錯說明、澄清回覆同樣適用此規則。
