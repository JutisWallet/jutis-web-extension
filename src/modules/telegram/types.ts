/**
 * Jutis Telegram Module — Core Types
 *
 * Notification module for wallet-triggered Telegram messages.
 * Models: target, rules, triggers, delivery.
 *
 * Capability state:
 * - scaffold: module exists, no target configured
 * - configured: Telegram username stored, not yet tested
 * - waiting-for-event-source: target set, event detection not implemented
 * - ready-for-delivery: target + rules set, delivery adapter scaffolded
 * - live: real delivery active (requires real bot token + event source)
 */

export type TelegramCapabilityState =
  | "scaffold"
  | "configured"
  | "waiting-for-event-source"
  | "ready-for-delivery"
  | "live";

/** Where to send a notification */
export interface TelegramUserTarget {
  username: string; // without @
  registeredAt: string; // ISO timestamp
  targetId: string;
  enabled: boolean;
}

/** What triggers a notification */
export type WalletEventTrigger =
  | { kind: "inbound_funds"; params?: { minAmount?: string; asset?: string } }
  | { kind: "outbound_funds"; params?: { minAmount?: string; asset?: string } }
  | { kind: "swap_completed"; params?: { pair?: string } }
  | { kind: "friend_request_received"; params?: Record<string, never> };

/** A registered notification rule */
export interface NotificationRule {
  id: string;
  targetId: string;
  trigger: WalletEventTrigger;
  enabled: boolean;
  createdAt: string;
  lastFiredAt?: string;
  description: string; // human-readable, e.g. "Notify when USDC arrives"
}

/** Result of attempting to deliver a notification */
export interface NotificationDeliveryResult {
  ok: boolean;
  ruleId: string;
  attemptId: string;
  message?: string;
  sentAt?: string;
}

/** Telegram module readiness snapshot */
export interface TelegramReadiness {
  state: TelegramCapabilityState;
  target: TelegramUserTarget | null;
  ruleCount: number;
  summary: string;
  blockers: string[];
}
