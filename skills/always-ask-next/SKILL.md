---
name: always-ask-next
description: Use when a task is about to be closed out and the agent must ask for the next action through AUQ, then continue in the same turn when the answer is actionable.
metadata:
  {
    "origin": "https://github.com/endman100/skill-always-ask-next",
    "modified": "routed to ask-user-questions MCP instead of built-in AskUserQuestion"
  }
---

# Always Ask Next

## Overview

在準備收尾前，強制透過 `ask-user-questions` MCP 問一次 `Next Action`。  
這不是收尾問卷，而是下一段執行流程的入口：若 blocking AUQ 已回傳可執行答案，Agent 應在同回合直接做，不可停在摘要或「下一步我會...」。

---

## Core Rules

**Before finishing all tasks, always call `ask_user_questions` (MCP: `ask-user-questions`) once, asking the user what to do next as a multiple-choice question.**

- 不要先發一般文字總結，再另外送 `Next Action` AUQ；狀態摘要必須直接放進 AUQ prompt。
- `title` 固定為 `"Next Action"`。
- `prompt` 必須先給短狀態摘要，再問下一步。
- `options` 至少 10 個，固定包含 `將本輪選項做完後結束`。
- 推薦項置頂；若有未 commit 變更，推薦項優先規則是：
  - `git worktree` 流程：`先 rebase 到 main，再 fast-forward 回主 worktree`
  - 非 `git worktree` 流程：`commit 本次變更`
- `multiSelect` 預設為 `true`。
- `nonBlocking` 固定為 `false`。
- 問題必須是 multiple choice；不得手動加入 `Other`。
- tool call 本身也要帶上狀態上下文，不可只丟抽象問句。

## Control Flow

收到 blocking AUQ 的答案後，預設流程只有這一條：

1. 問 `Next Action`
2. 收到答案
3. 把答案轉成本輪待辦
4. 立即開始執行
5. 做完全部已選項目或遇到明確阻塞後，才允許 final

只有以下情況可不直接執行：

- 選項彼此衝突
- 缺必要參數
- 使用者選的是純收尾/停止
- 工具、權限或外部依賴造成實質阻塞

若答案可直接執行，就視為「本輪仍在進行中」，不是下輪待辦。

## Answer Mapping

- 範例只示範「資料結構與格式」，**不得直接複製範例 label/description 語意**到實際提問。
- 實際輸出的每個 label 都必須符合 A-Z 編號格式（例如 `A. ...`、`B. ...`），不可省略編號。
- 真正輸出的選項必須來自「當前任務狀態」與「本 session 或記憶系統中可得的偏好訊號」。
- 生成流程建議：先產生候選集合，再依情境相關性、可執行性、歷史偏好加權排序，最後放入推薦項。
- 若情境訊號不足，先用 AUQ 補問關鍵偏好，再產生下一步選項；不可用靜態範例硬套。
- 範例中的 `<...>` 佔位符一律視為模板 token，不是預設內容。

答案轉待辦規則：

- 單選：直接把該選項視為本輪唯一待辦，立即執行。
- 多選：依「會改狀態的實作 -> 驗證/測試 -> 說明/展示 -> commit/收尾」的順序執行。
- 若包含 `將本輪選項做完後結束`：這不是一個獨立任務，而是本輪收尾旗標；代表其他被選項目做完即可結束。
- 若同時有 `commit 本次變更` 與實作/測試：先完成實作與驗證，再 commit。
- 若有單一選項其實只是「檢視/列出/規劃」且使用者明確選了它，也要在同輪實際產出結果，不可只回覆會去整理。

## Anti-Patterns

- AUQ 回答回來後，只回「收到，我接下來會...」但沒有在同輪開始做
- 把多選答案改寫成「我理解你的偏好是...」後直接結束
- 在答案已經足夠明確時，又額外追問一次只是為了形式確認
- 先做完整收尾訊息，再把真正執行留到下一輪
- 問完 `Next Action` 後，把 user choice 當成「下個 turn 的候選方向」
- final 訊息只報告使用者選了什麼，卻沒有證據顯示已實際執行
- 使用者已選 `開 rebuild branch`，但回覆停在「下一步我會開 branch」

## Self-Check

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
