/**
 * Jutis Telegram Module — Public Exports
 */

// Types
export type {
  TelegramCapabilityState,
  TelegramUserTarget,
  NotificationRule,
  WalletEventTrigger,
  NotificationDeliveryResult,
  TelegramReadiness,
} from "./types";

// Storage (for direct access if needed)
export {
  registerTarget,
  getTarget,
  clearTarget,
  addRule,
  getRules,
  getRulesForTrigger,
  setRuleEnabled,
  deleteRule,
  getCapabilityState,
} from "./storage";

// Services
export {
  TelegramNotificationService,
  telegramNotificationService,
  MockTelegramDeliveryAdapter,
  RealTelegramDeliveryAdapter,
  NotificationRuleEngine,
} from "./telegram-service";
export type { TelegramDeliveryAdapter } from "./telegram-service";
