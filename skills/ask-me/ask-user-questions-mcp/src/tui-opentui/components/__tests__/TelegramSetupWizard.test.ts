import { describe, expect, test } from "bun:test";

import { buildPairingStepState } from "../TelegramSetupWizard.js";

describe("TelegramSetupWizard pairing flow", () => {
  test("moves to pairing step after init returns bot link and pin", () => {
    expect(
      buildPairingStepState({
        botLink: "https://t.me/example_bot?start=pair_123",
        pin: "654321",
      }),
    ).toEqual({
      botLink: "https://t.me/example_bot?start=pair_123",
      mode: "pairing",
      pin: "654321",
      statusMessage: "請先開啟 Bot 連結，然後在 Telegram 輸入 PIN 完成綁定。",
      warningMessage: undefined,
    });
  });

  test("shows pairing-only warning when auto funnel did not produce a webhook", () => {
    expect(
      buildPairingStepState({
        botLink: "https://t.me/example_bot?start=pair_123",
        pin: "654321",
        funnelMode: "auto",
        hasWebhook: false,
      }),
    ).toEqual({
      botLink: "https://t.me/example_bot?start=pair_123",
      mode: "pairing",
      pin: "654321",
      statusMessage: "請先開啟 Bot 連結，然後在 Telegram 輸入 PIN 完成綁定。",
      warningMessage:
        "Tailscale Funnel 尚未成功啟用，目前是 pairing-only 模式。",
    });
  });
});
