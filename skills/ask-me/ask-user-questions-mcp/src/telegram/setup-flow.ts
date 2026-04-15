import type { TelegramConfig } from "../config/types.js";

import { findPendingPairingByTargetConfigFile } from "./pairing-file.js";

type TelegramConfigLike = Pick<
  TelegramConfig,
  "allowedChatId" | "enabled" | "tokenEnvKey" | "webhookUrl"
>;

export interface TelegramPairingStepState {
  botLink: string;
  expiresAt?: string;
  mode: "pairing";
  pin: string;
  statusMessage: string;
  warningMessage?: string;
}

export function isTelegramConfigured(telegram: TelegramConfigLike): boolean {
  const tokenEnvKey = telegram.tokenEnvKey?.trim() || "AUQ_TELEGRAM_BOT_TOKEN";
  const hasToken = (process.env[tokenEnvKey]?.trim().length ?? 0) > 0;
  const hasWebhook = (telegram.webhookUrl?.trim().length ?? 0) > 0;
  const hasAllowedChat = (telegram.allowedChatId?.trim().length ?? 0) > 0;
  return hasWebhook && hasToken && hasAllowedChat;
}

export function buildPairingStepState(values: {
  botLink: string;
  expiresAt?: string;
  funnelMode?: "auto" | "off";
  hasWebhook?: boolean;
  pin: string;
}): TelegramPairingStepState {
  return {
    botLink: values.botLink,
    expiresAt: values.expiresAt,
    mode: "pairing",
    pin: values.pin,
    statusMessage: "請先開啟 Bot 連結，然後在 Telegram 輸入 PIN 完成綁定。",
    warningMessage:
      values.funnelMode === "auto" && values.hasWebhook === false
        ? "Tailscale Funnel 尚未成功啟用，目前是 pairing-only 模式。"
        : undefined,
  };
}

export function resolvePendingPairingStepState(
  telegram: TelegramConfigLike,
  targetConfigFile: string,
): TelegramPairingStepState | null {
  const pairing = findPendingPairingByTargetConfigFile(targetConfigFile);
  if (!pairing?.botLink) {
    return null;
  }

  return buildPairingStepState({
    botLink: pairing.botLink,
    expiresAt: pairing.expiresAt,
    hasWebhook: telegram.webhookUrl.trim().length > 0,
    pin: pairing.pin,
  });
}
