/**
 * Jutis Agent Module — Notification Bridge
 *
 * Minimal integration point between the AI agent and Telegram notification setup.
 * This is a service-layer bridge — NOT connected to UI or wallet store.
 *
 * Flow this bridge supports:
 * 1. Agent recognizes notification intent (e.g. "para geldiğinde bildir")
 * 2. Bridge is called with the intent and optional Telegram username
 * 3. If username missing, bridge returns a "ask_user" response
 * 4. If username provided, bridge stores Telegram target and creates a notification rule
 * 5. Bridge returns the result of the registration
 *
 * This does NOT handle real event detection or real Telegram delivery —
 * those are handled by the Telegram module independently.
 */

import type { AgentIntent } from "./types";
import { telegramNotificationService } from "../telegram/telegram-service";

export type NotificationBridgeResult =
  | { ok: true; action: "stored"; ruleId: string; message: string }
  | { ok: true; action: "ask_username"; message: string }
  | { ok: false; action: "error"; message: string };

/**
 * Handle a notification-related intent from the agent.
 * Returns what the agent should say back to the user.
 */
export async function handleNotificationIntent(
  intent: AgentIntent,
  telegramUsername?: string
): Promise<NotificationBridgeResult> {
  const ruleType = intent.params?.ruleType as string | undefined;

  switch (intent.name) {
    case "notify_on_inbound_funds":
    case "notify_on_outbound_funds": {
      if (!telegramUsername) {
        return {
          ok: true,
          action: "ask_username",
          message:
            "I'd be happy to set up a notification for you. " +
            "What is your Telegram username (without the @ symbol)?",
        };
      }

      // Validate Telegram username format (rough)
      if (!/^[a-zA-Z0-9_]{5,32}$/.test(telegramUsername)) {
        return {
          ok: false,
          action: "error",
          message:
            "That doesn't look like a valid Telegram username. " +
            "Please check and try again (5–32 characters, letters, numbers, underscore).",
        };
      }

      // Register the Telegram target
      const targetResult = await telegramNotificationService.registerTarget(
        telegramUsername
      );
      if (!targetResult.ok) {
        return {
          ok: false,
          action: "error",
          message: `Failed to register Telegram target: ${targetResult.message}`,
        };
      }

      // Create the notification rule
      const ruleResult =
        intent.name === "notify_on_inbound_funds"
          ? await telegramNotificationService.createInboundFundsRule()
          : await telegramNotificationService.createOutboundFundsRule();

      if (!ruleResult.ok) {
        return {
          ok: false,
          action: "error",
          message: `Failed to create notification rule: ${ruleResult.message}`,
        };
      }

      return {
        ok: true,
        action: "stored",
        ruleId: ruleResult.ruleId ?? "unknown",
        message:
          `Done! I'll notify you on ${telegramUsername} when ${
            intent.name === "notify_on_inbound_funds"
              ? "funds arrive"
              : "funds are sent"
          }. ` +
          `Note: Live notifications require real event detection to be implemented.`,
      };
    }

    case "telegram_setup": {
      if (!telegramUsername) {
        return {
          ok: true,
          action: "ask_username",
          message:
            "I can help you set up Telegram notifications. " +
            "What is your Telegram username (without the @ symbol)?",
        };
      }

      const targetResult = await telegramNotificationService.registerTarget(
        telegramUsername
      );
      if (!targetResult.ok) {
        return {
          ok: false,
          action: "error",
          message: `Failed to register: ${targetResult.message}`,
        };
      }

      return {
        ok: true,
        action: "stored",
        ruleId: targetResult.targetId ?? "unknown",
        message: `Your Telegram (${telegramUsername}) is registered. You can now set up notification rules like "notify on inbound funds".`,
      };
    }

    default:
      return {
        ok: false,
        action: "error",
        message: `I don't know how to handle a ${intent.name} notification intent yet.`,
      };
  }
}
