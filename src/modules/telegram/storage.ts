/**
 * Jutis Telegram Module — Storage Layer
 *
 * Persists Telegram target and notification rules to chrome.storage.local.
 * Storage key: "jutis:telegram" (versioned).
 *
 * Honest: This stores preferences only. Real event detection and delivery
 * are NOT implemented here — they are modeled but scaffolded.
 */

import type {
  TelegramUserTarget,
  NotificationRule,
  TelegramCapabilityState,
} from "./types";

const STORAGE_KEY = "jutis:telegram";

interface TelegramStorage {
  version: number;
  target: TelegramUserTarget | null;
  rules: NotificationRule[];
}

function defaultStorage(): TelegramStorage {
  return { version: 1, target: null, rules: [] };
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** Load Telegram config from chrome.storage.local */
async function load(): Promise<TelegramStorage> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (items) => {
      const raw = items[STORAGE_KEY];
      if (raw && typeof raw === "object") {
        resolve(raw as TelegramStorage);
      } else {
        resolve(defaultStorage());
      }
    });
  });
}

/** Save Telegram config to chrome.storage.local */
async function save(data: TelegramStorage): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
  });
}

/** Get the current capability state */
export async function getCapabilityState(): Promise<TelegramCapabilityState> {
  const data = await load();
  if (!data.target) return "scaffold";
  if (!data.rules.length) return "configured";
  // Rules exist but event source not implemented
  return "waiting-for-event-source";
}

/** Register a Telegram target (username). Overwrites previous target. */
export async function registerTarget(
  username: string
): Promise<{ ok: boolean; targetId?: string; message?: string }> {
  const data = await load();
  const target: TelegramUserTarget = {
    username,
    registeredAt: new Date().toISOString(),
    targetId: generateId(),
    enabled: true,
  };
  data.target = target;
  await save(data);
  return { ok: true, targetId: target.targetId };
}

/** Get the current Telegram target */
export async function getTarget(): Promise<TelegramUserTarget | null> {
  return (await load()).target;
}

/** Remove the Telegram target and all associated rules */
export async function clearTarget(): Promise<void> {
  const data = await load();
  data.target = null;
  data.rules = [];
  await save(data);
}

/** Add a notification rule */
export async function addRule(
  rule: Omit<NotificationRule, "id" | "createdAt">
): Promise<{ ok: boolean; ruleId?: string; message?: string }> {
  const data = await load();
  if (!data.target) {
    return { ok: false, message: "No Telegram target registered" };
  }

  const newRule: NotificationRule = {
    ...rule,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  data.rules.push(newRule);
  await save(data);
  return { ok: true, ruleId: newRule.id };
}

/** Get all notification rules */
export async function getRules(): Promise<NotificationRule[]> {
  return (await load()).rules;
}

/** Get enabled rules for a specific trigger kind */
export async function getRulesForTrigger(
  triggerKind: string
): Promise<NotificationRule[]> {
  const data = await load();
  return data.rules.filter((r) => r.enabled && r.trigger.kind === triggerKind);
}

/** Update a rule's enabled state */
export async function setRuleEnabled(
  ruleId: string,
  enabled: boolean
): Promise<void> {
  const data = await load();
  const rule = data.rules.find((r) => r.id === ruleId);
  if (rule) {
    rule.enabled = enabled;
    await save(data);
  }
}

/** Delete a rule */
export async function deleteRule(ruleId: string): Promise<void> {
  const data = await load();
  data.rules = data.rules.filter((r) => r.id !== ruleId);
  await save(data);
}

/** Update lastFiredAt for a rule */
export async function markRuleFired(ruleId: string): Promise<void> {
  const data = await load();
  const rule = data.rules.find((r) => r.id === ruleId);
  if (rule) {
    rule.lastFiredAt = new Date().toISOString();
    await save(data);
  }
}
