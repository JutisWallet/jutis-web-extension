/**
 * Jutis Telegram Module — Telegram Notification Service
 *
 * Provides:
 * - TelegramNotificationService: high-level API for target + rule management
 * - TelegramDeliveryAdapter: scaffolded delivery interface (mock by default)
 * - NotificationRuleEngine: evaluates wallet events against registered rules
 *
 * Honest: Real Telegram bot delivery is NOT implemented.
 * The delivery adapter is scaffolded — it will log to console and return mock results.
 * A real implementation would need:
 * - A Telegram Bot API token (from @BotFather)
 * - A backend relay service (Telegram Bot API cannot send messages proactively to users
 *   without a bot token + chat_id mapping stored)
 * - A webhook or polling mechanism for the bot to receive chat_id
 *
 * Real wallet event detection (inbound funds watcher) is also NOT implemented.
 * The rule engine can evaluate events IF they are pushed to it — but there is
 * no live Canton event indexer or wallet event subscription in this module.
 */

import type {
  TelegramUserTarget,
  NotificationRule,
  WalletEventTrigger,
  NotificationDeliveryResult,
  TelegramReadiness,
  TelegramCapabilityState,
} from "./types";
import * as storage from "./storage";

// ---------------------------------------------------------------------------
// Delivery Adapter
// ---------------------------------------------------------------------------

export interface TelegramDeliveryAdapter {
  /** Send a message to a Telegram user. Returns delivery result. */
  send(
    username: string,
    text: string,
    ruleId: string
  ): Promise<NotificationDeliveryResult>;
}

function generateAttemptId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** Mock delivery adapter — logs and returns mock results. NOT real delivery. */
export class MockTelegramDeliveryAdapter implements TelegramDeliveryAdapter {
  async send(
    username: string,
    text: string,
    ruleId: string
  ): Promise<NotificationDeliveryResult> {
    console.info(
      `[MockTelegramDelivery] Would send to @${username}: "${text}" (rule: ${ruleId})`
    );

    // Simulate async
    await new Promise((r) => setTimeout(r, 50));

    return {
      ok: true,
      ruleId,
      attemptId: generateAttemptId(),
      message: `[MOCK] Would send to @${username}: ${text}`,
      sentAt: new Date().toISOString(),
    };
  }
}

/** Placeholder for when a real Telegram bot relay is configured */
export class RealTelegramDeliveryAdapter implements TelegramDeliveryAdapter {
  constructor(private botToken: string, private relayUrl: string) {}

  async send(
    username: string,
    text: string,
    ruleId: string
  ): Promise<NotificationDeliveryResult> {
    // TODO: In a real implementation:
    // 1. Look up chat_id for username (requires a bot + chat_id storage)
    // 2. POST to Telegram Bot API: https://api.telegram.org/bot{token}/sendMessage
    // 3. Return real result
    // For now: still mock
    console.warn(
      `[RealTelegramDelivery] Not implemented — set relayUrl: ${this.relayUrl}`
    );
    return {
      ok: false,
      ruleId,
      attemptId: generateAttemptId(),
      message: "Real Telegram delivery not yet implemented",
    };
  }
}

// ---------------------------------------------------------------------------
// Notification Rule Engine
// ---------------------------------------------------------------------------

export class NotificationRuleEngine {
  constructor(private adapter: TelegramDeliveryAdapter) {}

  /**
   * Evaluate a wallet event against all matching enabled rules.
   * If event source was pushing events (not implemented yet), this would be called.
   *
   * Honest: No live event source exists. This is a scaffold for when one does.
   */
  async evaluateEvent(
    trigger: WalletEventTrigger
  ): Promise<NotificationDeliveryResult[]> {
    const rules = await storage.getRulesForTrigger(trigger.kind);
    const results: NotificationDeliveryResult[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;
      const target = await storage.getTarget();
      if (!target || !target.enabled) continue;

      // Format message based on trigger kind
      const message = this.formatMessage(trigger, rule);

      const result = await this.adapter.send(
        target.username,
        message,
        rule.id
      );

      if (result.ok) {
        await storage.markRuleFired(rule.id);
      }

      results.push(result);
    }

    return results;
  }

  private formatMessage(trigger: WalletEventTrigger, rule: NotificationRule): string {
    switch (trigger.kind) {
      case "inbound_funds":
        return `🔔 Jutis: Funds have arrived in your wallet!`;
      case "outbound_funds":
        return `📤 Jutis: Funds have been sent from your wallet.`;
      case "swap_completed":
        return `🔄 Jutis: A swap has been completed.`;
      case "friend_request_received":
        return `👤 Jutis: You have a new friend request!`;
      default: {
        // Exhaustive — all WalletEventTrigger variants handled above
        const _exhaustive: never = trigger;
        return `🔔 Jutis: Unknown event`;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Telegram Notification Service
// ---------------------------------------------------------------------------

export class TelegramNotificationService {
  private adapter: TelegramDeliveryAdapter;

  constructor(adapter?: TelegramDeliveryAdapter) {
    this.adapter = adapter ?? new MockTelegramDeliveryAdapter();
  }

  /** Swap the delivery adapter (e.g. from mock to real) */
  setAdapter(adapter: TelegramDeliveryAdapter): void {
    this.adapter = adapter;
  }

  /** Register a Telegram username as the notification target */
  async registerTarget(
    username: string
  ): Promise<{ ok: boolean; targetId?: string; message?: string }> {
    return storage.registerTarget(username);
  }

  /** Get current target */
  async getTarget(): Promise<TelegramUserTarget | null> {
    return storage.getTarget();
  }

  /** Remove target and all rules */
  async clearTarget(): Promise<void> {
    return storage.clearTarget();
  }

  /** Create an inbound funds notification rule */
  async createInboundFundsRule(
    minAmount?: string
  ): Promise<{ ok: boolean; ruleId?: string; message?: string }> {
    const trigger: WalletEventTrigger = {
      kind: "inbound_funds",
      params: minAmount ? { minAmount } : undefined,
    };
    const target = await storage.getTarget();
    if (!target) return { ok: false, message: "No Telegram target registered" };

    return storage.addRule({
      targetId: target.targetId,
      trigger,
      enabled: true,
      description: minAmount
        ? `Notify when ≥ ${minAmount} USDC arrives`
        : "Notify when any funds arrive",
    });
  }

  /** Create an outbound funds notification rule */
  async createOutboundFundsRule(
    minAmount?: string
  ): Promise<{ ok: boolean; ruleId?: string; message?: string }> {
    const trigger: WalletEventTrigger = {
      kind: "outbound_funds",
      params: minAmount ? { minAmount } : undefined,
    };
    const target = await storage.getTarget();
    if (!target) return { ok: false, message: "No Telegram target registered" };

    return storage.addRule({
      targetId: target.targetId,
      trigger,
      enabled: true,
      description: minAmount
        ? `Notify when ≥ ${minAmount} USDC is sent`
        : "Notify when any funds are sent",
    });
  }

  /** Create a swap completed rule */
  async createSwapCompletedRule(
    pair?: string
  ): Promise<{ ok: boolean; ruleId?: string; message?: string }> {
    const trigger: WalletEventTrigger = {
      kind: "swap_completed",
      params: pair ? { pair } : undefined,
    };
    const target = await storage.getTarget();
    if (!target) return { ok: false, message: "No Telegram target registered" };

    return storage.addRule({
      targetId: target.targetId,
      trigger,
      enabled: true,
      description: pair ? `Notify when ${pair} swap completes` : "Notify when any swap completes",
    });
  }

  /** Get all rules */
  async listRules(): Promise<NotificationRule[]> {
    return storage.getRules();
  }

  /** Enable or disable a rule */
  async setRuleEnabled(ruleId: string, enabled: boolean): Promise<void> {
    return storage.setRuleEnabled(ruleId, enabled);
  }

  /** Delete a rule */
  async deleteRule(ruleId: string): Promise<void> {
    return storage.deleteRule(ruleId);
  }

  /** Get current readiness state */
  async getReadiness(): Promise<TelegramReadiness> {
    const state = await storage.getCapabilityState();
    const target = await storage.getTarget();
    const rules = await storage.getRules();

    const blockers: string[] = [];
    if (state === "scaffold") {
      blockers.push("No Telegram target registered");
    }
    if (state === "waiting-for-event-source") {
      blockers.push("Real wallet event detection not implemented — rules exist but no event source pushes to them");
    }
    if (state === "ready-for-delivery" && !(this.adapter instanceof MockTelegramDeliveryAdapter) === false) {
      blockers.push("Using mock delivery adapter — real Telegram bot not configured");
    }

    const stateDescriptions: Record<TelegramCapabilityState, string> = {
      scaffold: "No Telegram target registered — scaffold only",
      configured: "Telegram username stored — waiting for event source",
      "waiting-for-event-source": "Rules created — waiting for live wallet event detection",
      "ready-for-delivery": "Rules + delivery adapter ready — requires live event source",
      live: "Live notification delivery active (requires real bot + real event source)",
    };

    return {
      state,
      target,
      ruleCount: rules.length,
      summary: stateDescriptions[state],
      blockers,
    };
  }

  /** Get the rule engine for event evaluation */
  getRuleEngine(): NotificationRuleEngine {
    return new NotificationRuleEngine(this.adapter);
  }
}

/** Shared singleton instance — initialized with mock adapter */
export const telegramNotificationService = new TelegramNotificationService();
